import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { buildDefaultPartOrder, moveOrderedPart } from "./augmentationDomain.js";
import {
  buildAugmentationTitle,
  buildAugmentationProject,
  catalogPartToDomain,
  findCatalogContext,
  findCatalogPartByKey,
  hydrateProjectSourceText,
  loadAugmentationCatalog,
  loadPartTexts,
  loadRecipeSources,
  refreshAugmentationProject
} from "./augmentationProject.js";
import {
  hasPartTextSectionSeparators,
  isPartTextSectionSeparator,
  isSectionedPartTextHeading,
  splitPartText
} from "../library/partText.js";
import {
  createAugmentationNotifier,
  createAugmentationStorage,
  requestAugmentationPersistence
} from "./augmentationStorage.js";
import {
  createWorkspace,
  mergeWorkspaceProjects,
  parseWorkspace,
  serializeWorkspace
} from "./augmentationWorkspace.js";
import {
  AUGMENTATION_GRADE_SLUGS,
  downloadWorkspaceText,
  localStudyPath,
  orderAugmentationGradeSlugs,
  projectDetailPath
} from "./augmentationBrowser.js";
import {
  clearCachedExportJob,
  createExportJob,
  DEFAULT_AUGMENTATION_EXPORT_API,
  findExportArtifact,
  getExportJob,
  inspectExportArtifacts,
  pollExportJob,
  readCachedExportJob,
  resolveArtifactUrl,
  writeCachedExportJob
} from "./augmentationExportClient.js";

function closeDialog(dialog) {
  if (typeof dialog?.close === "function") {
    dialog.close();
  } else {
    dialog?.removeAttribute("open");
  }
}

function showDialog(dialog) {
  if (typeof dialog?.showModal === "function") {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    dialog?.setAttribute("open", "");
  }
}

function moveLabel(labels, part, direction) {
  return `${direction < 0 ? labels.moveUp : labels.moveDown}: ${part.partNo.toUpperCase()} ${part.title}`;
}

function isPendingExportJob(job) {
  return job?.status === "queued" || job?.status === "running";
}

function AugmentedSourceText({ heading, text }) {
  const source = String(text ?? "").trim();
  if (!source) {
    return null;
  }
  const paragraphs = splitPartText(source);
  const hasSectionSeparators = hasPartTextSectionSeparators(paragraphs);

  return (
    <section class="personal-augmentation-source" aria-labelledby="personal-augmentation-source-heading">
      <h2 id="personal-augmentation-source-heading">{heading}</h2>
      <div class="part-text personal-augmentation-source-text">
        {paragraphs.map((paragraph, index) => (
          <p class={[
            "part-paragraph",
            `part-paragraph--${paragraph.alignment}`,
            isSectionedPartTextHeading(paragraphs, index, hasSectionSeparators) ? "part-text-section-heading" : "",
            isPartTextSectionSeparator(paragraph) ? "part-text-section-separator" : ""
          ].filter(Boolean).join(" ")}>
            {paragraph.segments.map((segment) => (
              <span class={`part-script part-script--${segment.script}`}>{segment.value}</span>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}

export function AugmentationLauncher({ bookSlug, partNo = null, locale = "tr", labels, gradeLabels = {} }) {
  const dialogRef = useRef(null);
  const currentRowRef = useRef(null);
  const selectionSequence = useRef(1);
  const operationAbortRef = useRef(null);
  const storage = useMemo(() => createAugmentationStorage(), []);
  const [catalog, setCatalog] = useState(null);
  const [basePart, setBasePart] = useState(null);
  const [currentBookSlug, setCurrentBookSlug] = useState(bookSlug);
  const [orderedParts, setOrderedParts] = useState([]);
  const [manualOrder, setManualOrder] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    operationAbortRef.current?.abort();
    storage.close();
  }, [storage]);

  useEffect(() => {
    if (currentBookSlug === bookSlug && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [catalog, currentBookSlug, bookSlug]);

  const open = async () => {
    setStatus("");
    showDialog(dialogRef.current);
    if (catalog) {
      return;
    }
    operationAbortRef.current?.abort();
    const controller = new AbortController();
    operationAbortRef.current = controller;
    setBusy(true);
    try {
      const loadedCatalog = await loadAugmentationCatalog({ signal: controller.signal });
      const book = loadedCatalog.books.find((item) => item.slug === bookSlug);
      const context = partNo ? findCatalogContext(loadedCatalog, bookSlug, partNo) : null;
      if (!book || (partNo && !context)) {
        throw new Error(labels.loadError);
      }
      const base = context
        ? catalogPartToDomain(context.book, context.part, selectionSequence.current++)
        : null;
      setCatalog(loadedCatalog);
      setBasePart(base);
      setOrderedParts(base ? [base] : []);
      setSelectedGrades([]);
      setCurrentBookSlug(bookSlug);
    } catch (error) {
      if (error.name !== "AbortError") {
        setStatus(error.message || labels.loadError);
      }
    } finally {
      if (operationAbortRef.current === controller) {
        operationAbortRef.current = null;
        setBusy(false);
      }
    }
  };

  const cancelDialog = () => {
    operationAbortRef.current?.abort();
    closeDialog(dialogRef.current);
  };

  const currentBook = catalog?.books?.find((book) => book.slug === currentBookSlug);
  const selectedKeys = useMemo(() => new Set(orderedParts.map((part) => part.key)), [orderedParts]);
  const selectedCurrentBookParts = useMemo(
    () => (currentBook?.parts ?? []).filter((part) => selectedKeys.has(part.key)),
    [currentBook, selectedKeys]
  );
  const canSelectNeighbors = useMemo(() => {
    if (!currentBook || orderedParts.length === 0 || selectedCurrentBookParts.length !== orderedParts.length) {
      return false;
    }
    const indexes = selectedCurrentBookParts
      .map((part) => currentBook.parts.findIndex((candidate) => candidate.key === part.key))
      .sort((left, right) => left - right);
    return indexes.every((index, position) => position === 0 || index === indexes[position - 1] + 1);
  }, [currentBook, orderedParts.length, selectedCurrentBookParts]);
  const neighborKeys = useMemo(() => {
    if (!currentBook || !canSelectNeighbors) {
      return new Set();
    }
    const indexes = selectedCurrentBookParts
      .map((part) => currentBook.parts.findIndex((candidate) => candidate.key === part.key))
      .sort((left, right) => left - right);
    return new Set([
      currentBook.parts[indexes[0] - 1]?.key,
      currentBook.parts[indexes[indexes.length - 1] + 1]?.key
    ].filter(Boolean));
  }, [canSelectNeighbors, currentBook, selectedCurrentBookParts]);

  const orderParts = (parts) => basePart
    ? buildDefaultPartOrder(basePart, parts)
    : [...parts].sort((left, right) =>
      (left.bookSlug === bookSlug ? 0 : 1) - (right.bookSlug === bookSlug ? 0 : 1)
      || (left.bookSlug === right.bookSlug ? (left.partNumber ?? Number.MAX_SAFE_INTEGER) - (right.partNumber ?? Number.MAX_SAFE_INTEGER) : 0)
      || (left.selectionSequence ?? Number.MAX_SAFE_INTEGER) - (right.selectionSequence ?? Number.MAX_SAFE_INTEGER)
    );

  const togglePart = (book, part, selected) => {
    if (basePart && part.key === basePart.key) {
      return;
    }
    let next;
    if (selected) {
      next = [...orderedParts, catalogPartToDomain(book, part, selectionSequence.current++)];
    } else {
      next = orderedParts.filter((item) => item.key !== part.key);
    }
    setOrderedParts(manualOrder ? next : orderParts(next));
  };

  const selectNeighbors = () => {
    if (!catalog || !canSelectNeighbors) {
      return;
    }
    const additions = [...neighborKeys]
      .filter((key) => !selectedKeys.has(key))
      .map((key) => {
        const context = findCatalogPartByKey(catalog, key);
        return catalogPartToDomain(context.book, context.part, selectionSequence.current++);
      });
    setOrderedParts(orderParts([...orderedParts, ...additions]));
    setManualOrder(false);
  };

  const move = (key, delta) => {
    setOrderedParts(moveOrderedPart(orderedParts, key, delta));
    setManualOrder(true);
  };

  const resetOrder = () => {
    setOrderedParts(orderParts(orderedParts));
    setManualOrder(false);
  };

  const toggleGrade = (gradeSlug) => {
    setSelectedGrades((current) => current.includes(gradeSlug)
      ? current.filter((grade) => grade !== gradeSlug)
      : [...current, gradeSlug]);
  };

  const createProject = async () => {
    const projectBasePart = basePart ?? orderedParts[0];
    if (!catalog || !projectBasePart) {
      return;
    }
    if (orderedParts.length < 2) {
      setStatus(labels.selectAnotherPart);
      return;
    }
    if (selectedGrades.length === 0) {
      setStatus(labels.selectGrade);
      return;
    }
    operationAbortRef.current?.abort();
    const controller = new AbortController();
    operationAbortRef.current = controller;
    setBusy(true);
    setStatus(labels.creating);
    try {
      const [loaded, loadedTexts] = await Promise.all([
        loadRecipeSources({
          catalog,
          orderedPartKeys: orderedParts.map((part) => part.key),
          gradeSlugs: selectedGrades,
          signal: controller.signal
        }),
        loadPartTexts({
          orderedParts,
          signal: controller.signal
        })
      ]);
      const project = buildAugmentationProject({
        title: buildAugmentationTitle(orderedParts),
        catalogRevision: catalog.catalogRevision,
        basePart: projectBasePart,
        orderedParts,
        gradeSlugs: selectedGrades,
        sourceTextByPartKey: loadedTexts.sourceTextByPartKey,
        ...loaded
      });
      if (!Object.values(project.gradeResults).some((result) => result.status === "ready")) {
        throw new Error(Object.values(project.gradeResults).map((result) => result.error).filter(Boolean).join("; "));
      }
      const saved = await storage.saveProject(project);
      await requestAugmentationPersistence();
      const notifier = createAugmentationNotifier();
      notifier.publish({ type: "project-created", projectId: saved.id, bookSlug: saved.homeBookSlug });
      notifier.close();
      window.location.assign(`${projectDetailPath(saved, locale)}&prepare=1`);
    } catch (error) {
      if (error.name !== "AbortError") {
        setStatus(error.message || labels.loadError);
      }
    } finally {
      if (operationAbortRef.current === controller) {
        operationAbortRef.current = null;
        setBusy(false);
      }
    }
  };

  const projectBasePart = basePart ?? orderedParts[0];
  const availableGrades = projectBasePart && catalog
    ? orderAugmentationGradeSlugs(Object.keys(findCatalogPartByKey(catalog, projectBasePart.key)?.part?.grades ?? {}))
    : [];

  return (
    <div class="augmentation-launcher">
      <button class="button" type="button" onClick={open}>{labels.launch}</button>
      <p class="augmentation-launcher__help">{labels.launchHelp}</p>
      <dialog class="augmentation-dialog" ref={dialogRef} aria-labelledby="augmentation-dialog-title" onCancel={cancelDialog}>
        <div class="augmentation-dialog__panel">
          <header class="augmentation-dialog__head">
            <div>
              <h2 id="augmentation-dialog-title">{labels.dialogTitle}</h2>
              <p>{labels.intro}</p>
            </div>
            <button class="button-secondary" type="button" onClick={cancelDialog}>{labels.cancel}</button>
          </header>

          {busy && !catalog ? <p class="filter-status" aria-live="polite">{labels.loading}</p> : null}
          {catalog ? (
            <div class="augmentation-picker">
              <section class="augmentation-picker__available" aria-labelledby="augmentation-parts-heading">
                <div class="field">
                  <label for="augmentation-book">{labels.bookLabel}</label>
                  <select
                    id="augmentation-book"
                    value={currentBookSlug}
                    onChange={(event) => setCurrentBookSlug(event.currentTarget.value)}
                  >
                    {catalog.books.map((book) => <option value={book.slug}>{book.title}</option>)}
                  </select>
                </div>
                <div class="augmentation-section-head">
                  <h3 id="augmentation-parts-heading">{labels.partsHeading}</h3>
                  {currentBookSlug === bookSlug ? (
                    <button class="button-secondary" type="button" onClick={selectNeighbors} disabled={!canSelectNeighbors}>{labels.selectNeighbors}</button>
                  ) : null}
                </div>
                <div class="augmentation-part-options">
                  {(currentBook?.parts ?? []).map((part) => {
                    const isCurrent = part.key === basePart?.key;
                    const isNeighbor = neighborKeys.has(part.key);
                    return (
                      <label
                        class={`augmentation-part-option${isCurrent ? " is-current" : ""}${isNeighbor ? " is-neighbor" : ""}`}
                        ref={isCurrent ? currentRowRef : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(part.key)}
                          disabled={isCurrent}
                          onChange={(event) => togglePart(currentBook, part, event.currentTarget.checked)}
                        />
                        <span class="augmentation-part-option__number">{part.partNo.toUpperCase()}</span>
                        <span class="augmentation-part-option__title">{part.title}</span>
                        {isCurrent ? <span class="pill">{labels.current}</span> : null}
                        {isNeighbor ? <span class="pill">{labels.neighbor}</span> : null}
                      </label>
                    );
                  })}
                </div>
              </section>

              <section class="augmentation-picker__selected" aria-labelledby="augmentation-order-heading">
                <div class="augmentation-section-head">
                  <h3 id="augmentation-order-heading">{labels.selectedHeading}</h3>
                  <button class="button-secondary" type="button" onClick={resetOrder} disabled={!manualOrder}>{labels.resetOrder}</button>
                </div>
                <ol class="augmentation-order-list">
                  {orderedParts.map((part, index) => (
                    <li>
                      <span><strong>{part.partNo.toUpperCase()}</strong> {part.title}</span>
                      <span class="augmentation-order-list__actions">
                        <button type="button" aria-label={moveLabel(labels, part, -1)} onClick={() => move(part.key, -1)} disabled={index === 0}>↑</button>
                        <button type="button" aria-label={moveLabel(labels, part, 1)} onClick={() => move(part.key, 1)} disabled={index === orderedParts.length - 1}>↓</button>
                      </span>
                    </li>
                  ))}
                </ol>

                <fieldset class="augmentation-grades">
                  <legend>{labels.gradesHeading}</legend>
                  {availableGrades.map((gradeSlug) => (
                    <label>
                      <input type="checkbox" checked={selectedGrades.includes(gradeSlug)} onChange={() => toggleGrade(gradeSlug)} />
                      <span>{gradeLabels[gradeSlug] ?? gradeSlug}</span>
                    </label>
                  ))}
                  <button class="button-secondary" type="button" onClick={() => setSelectedGrades([...availableGrades])}>{labels.selectAllGrades}</button>
                </fieldset>
              </section>
            </div>
          ) : null}

          {status ? <p class="empty-state augmentation-status" aria-live="polite">{status}</p> : null}
          <footer class="augmentation-dialog__actions">
            <button class="button-secondary" type="button" onClick={cancelDialog}>{labels.cancel}</button>
            <button class="button" type="button" onClick={createProject} disabled={busy || !catalog}>{busy ? labels.creating : labels.create}</button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}

export function PersonalAugmentationList({ bookSlug, locale = "tr", labels }) {
  const storage = useMemo(() => createAugmentationStorage(), []);
  const notifier = useMemo(() => createAugmentationNotifier(), []);
  const fileRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("");

  const refresh = async () => {
    try {
      setProjects(await storage.listProjectsByBook(bookSlug));
    } catch (error) {
      setStatus(error.message);
    }
  };

  useEffect(() => {
    refresh();
    const unsubscribe = notifier.subscribe((message) => {
      if (!message.bookSlug || message.bookSlug === bookSlug) {
        refresh();
      }
    });
    return () => {
      unsubscribe();
      notifier.close();
      storage.close();
    };
  }, [bookSlug]);

  const exportProjects = async () => {
    const all = await storage.listProjects();
    const catalog = await loadAugmentationCatalog();
    downloadWorkspaceText(serializeWorkspace(createWorkspace({
      catalogRevision: catalog.catalogRevision,
      projects: all
    })));
  };

  const importProjects = async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    try {
      const catalog = await loadAugmentationCatalog();
      const workspace = parseWorkspace(await file.text(), { currentCatalogRevision: catalog.catalogRevision });
      const existing = await storage.listProjects();
      const merged = mergeWorkspaceProjects(existing, workspace.projects, { strategy: "copy" });
      const existingIds = new Set(existing.map((project) => project.id));
      for (const project of merged.projects.filter((item) => !existingIds.has(item.id))) {
        await storage.saveProject(project);
      }
      setStatus(workspace.catalogMismatch ? `${labels.importComplete} ${labels.backupWarning}` : labels.importComplete);
      notifier.publish({ type: "workspace-imported" });
      await refresh();
    } catch (error) {
      setStatus(error.message);
    } finally {
      event.currentTarget.value = "";
    }
  };

  return (
    <section class="personal-augmentations" aria-labelledby="personal-augmentations-heading">
      <div class="personal-augmentations__head">
        <div>
          <p class="eyebrow">{labels.localBadge}</p>
          <h2 id="personal-augmentations-heading">{labels.personalHeading}</h2>
          <p>{labels.personalDescription}</p>
        </div>
        <div class="personal-augmentations__actions">
          <button class="button-secondary" type="button" onClick={exportProjects}>{labels.exportWorkspace}</button>
          <button class="button-secondary" type="button" onClick={() => fileRef.current?.click()}>{labels.importWorkspace}</button>
          <input ref={fileRef} type="file" accept=".json,.rissor-workspace.json" onChange={importProjects} hidden />
        </div>
      </div>
      <p class="personal-augmentations__warning">{labels.backupWarning}</p>
      {status ? <p class="filter-status" aria-live="polite">{status}</p> : null}
      {projects.length === 0 ? <p class="empty-state">{labels.noPersonal}</p> : (
        <div class="personal-augmentation-list">
          {projects.map((project) => {
            const readyGrades = Object.values(project.gradeResults ?? {}).filter((result) => result.status === "ready").length;
            return (
              <article class="part-row part-row--personal">
                <div class="part-row__number">+</div>
                <div class="part-row__body">
                  <a class="part-row__title" href={projectDetailPath(project, locale)}>{project.title}</a>
                  <ul class="meta-list part-row__capabilities">
                    <li class="pill">{labels.localBadge}</li>
                    <li class="pill">{project.orderedParts.length} {labels.sourcesHeading.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en")}</li>
                    <li class="pill">{readyGrades} {labels.gradesHeading.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en")}</li>
                  </ul>
                </div>
                <a class="button-secondary" href={projectDetailPath(project, locale)}>{locale === "en" ? "Open" : "Aç"}</a>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DocumentFormatControl({ available, label, actionLabel }) {
  const [format, setFormat] = useState("");
  const selected = available.find((item) => item.format === format && item.artifact) ?? available.find((item) => item.artifact);
  return <div class="download-grid"><select aria-label={label} value={selected?.format ?? ""} onChange={(event) => setFormat(event.currentTarget.value)}>{available.map((item) => <option value={item.format} disabled={!item.artifact}>{item.text}</option>)}</select>{selected ? <a class="button-secondary" href={resolveArtifactUrl(selected.artifact, DEFAULT_AUGMENTATION_EXPORT_API)} download={selected.artifact.name}>{actionLabel}</a> : <span class="button-muted">{actionLabel}</span>}</div>;
}

export function PersonalAugmentationDetail({ bookSlug, locale = "tr", labels, gradeLabels = {} }) {
  const storage = useMemo(() => createAugmentationStorage(), []);
  const exportAbortRef = useRef(null);
  const autoPrepareRef = useRef(false);
  const addGradesDialogRef = useRef(null);
  const [visibleGrades, setVisibleGrades] = useState([]);
  const [additionalGrades, setAdditionalGrades] = useState([]);
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [exportJob, setExportJob] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [restoring, setRestoring] = useState(true);
  const [fileCheck, setFileCheck] = useState(null);
  const [fileCheckError, setFileCheckError] = useState("");

  const restoreCachedDocuments = async (loadedProject, { signal, isActive = () => true } = {}) => {
    const cached = readCachedExportJob(loadedProject);
    if (!cached) {
      if (isActive()) setRestoring(false);
      return;
    }

    if (isPendingExportJob(cached) && isActive()) {
      setExportBusy(true);
      setExportStatus(labels.preparingDocuments);
    }

    const clearRestoredJob = () => {
      clearCachedExportJob(loadedProject);
      if (isActive()) {
        setExportJob(null);
        setExportStatus("");
      }
    };

    try {
      const current = await getExportJob(cached.id, { signal });
      if (!isActive()) {
        return;
      }
      if (current.status === "ready") {
        setExportJob(current);
        setExportStatus(labels.exportsReady);
        writeCachedExportJob(loadedProject, current);
        return;
      }
      if (isPendingExportJob(current)) {
        setExportBusy(true);
        setExportStatus(labels.preparingDocuments);
        const ready = await pollExportJob(current.id, { signal });
        if (!isActive()) {
          return;
        }
        setExportJob(ready);
        setExportStatus(labels.exportsReady);
        writeCachedExportJob(loadedProject, ready);
        return;
      }
      clearRestoredJob();
    } catch (error) {
      if (error.name !== "AbortError") {
        if (error.status === 404 || error.status === 410) clearRestoredJob();
        else setFileCheckError(error.message || labels.exportServiceUnavailable);
      }
    } finally {
      if (isActive()) {
        setRestoring(false);
        setExportBusy(false);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
      setStatus(labels.missingProject);
      return;
    }
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const loaded = await storage.getProject(id);
        if (!loaded || loaded.homeBookSlug !== bookSlug) {
          if (active) {
            setStatus(labels.missingProject);
          }
          return;
        }
        if (!active) {
          return;
        }
        autoPrepareRef.current = params.get("prepare") === "1";
        setProject(loaded);
        const readyGrades = Object.keys(loaded.gradeResults ?? {}).filter((grade) => loaded.gradeResults[grade]?.status === "ready");
        try {
          const saved = JSON.parse(localStorage.getItem(`augmentation-visible-grades:${loaded.id}`) ?? "null");
          setVisibleGrades(Array.isArray(saved) ? saved.filter((grade) => readyGrades.includes(grade)) : readyGrades);
        } catch { setVisibleGrades(readyGrades); }
        setTitle(loaded.title);
        document.title = loaded.title;
        restoreCachedDocuments(loaded, {
          signal: controller.signal,
          isActive: () => active
        });

        if (String(loaded.sourceText ?? "").trim()) {
          return;
        }

        try {
          const catalog = await loadAugmentationCatalog({ signal: controller.signal });
          const hydrated = await hydrateProjectSourceText({
            project: loaded,
            catalog,
            signal: controller.signal
          });
          if (!active || !String(hydrated?.sourceText ?? "").trim()) {
            return;
          }

          try {
            const saved = await storage.saveProject(hydrated, { expectedRevision: loaded.revision });
            if (active) {
              setProject(saved);
            }
          } catch {
            if (active) {
              setProject(hydrated);
            }
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            // Source text hydration is best-effort for projects created before source snapshots existed.
          }
        }
      } catch (error) {
        if (error.name !== "AbortError" && active) {
          setStatus(error.message);
        }
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
      exportAbortRef.current?.abort();
      storage.close();
    };
  }, [bookSlug]);

  useEffect(() => {
    if (!project || restoring || exportBusy || fileCheckError) return;
    const controller = new AbortController();
    const grades = Object.keys(project.gradeResults ?? {}).filter((grade) => project.gradeResults[grade]?.status === "ready");
    setFileCheck(null);
    inspectExportArtifacts(exportJob, grades, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setFileCheck(result);
    }).catch((error) => {
      if (error.name !== "AbortError") setFileCheckError(error.message || labels.exportServiceUnavailable);
    });
    return () => controller.abort();
  }, [project, exportJob, restoring, exportBusy]);

  const saveTitle = async () => {
    if (!project || !title.trim()) {
      return;
    }
    try {
      const saved = await storage.saveProject({ ...project, title: title.trim() }, { expectedRevision: project.revision });
      setProject(saved);
      setExportJob(null);
      setExportStatus("");
      clearCachedExportJob(project);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  };

  const exportProject = () => {
    if (!project) return;
    downloadWorkspaceText(
      serializeWorkspace(createWorkspace({ catalogRevision: project.catalogRevision, projects: [project] })),
      `${project.homeBookSlug}-${project.id}.rissor-workspace.json`
    );
  };

  const removeProject = async () => {
    if (!project || !window.confirm(labels.deleteConfirm)) {
      return;
    }
    clearCachedExportJob(project);
    await storage.deleteProject(project.id);
    window.location.assign(locale === "en" ? `/en/books/${bookSlug}/` : `/soru-bankalari/${bookSlug}/`);
  };

  const prepareDocuments = async () => {
    if (!project || exportBusy) return;
    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportBusy(true);
    setExportJob(null);
    setFileCheckError("");
    setExportStatus(labels.preparingDocuments);
    setStatus("");
    try {
      const catalog = await loadAugmentationCatalog({ signal: controller.signal });
      const refreshed = await refreshAugmentationProject({ project, catalog, signal: controller.signal });
      const exportProject = refreshed === project
        ? project
        : await storage.saveProject(refreshed, { expectedRevision: project.revision });
      if (refreshed !== project) {
        clearCachedExportJob(project);
        setProject(exportProject);
      }
      const created = await createExportJob(exportProject, { signal: controller.signal });
      writeCachedExportJob(exportProject, created);
      const ready = await pollExportJob(created.id, { signal: controller.signal });
      setExportJob(ready);
      setExportStatus(labels.exportsReady);
      writeCachedExportJob(exportProject, ready);
    } catch (error) {
      if (error.name !== "AbortError") {
        const message = error.code === "export-service-unavailable"
          ? labels.exportServiceUnavailable
          : error.message;
        setExportStatus(`${labels.exportFailed} ${message}`);
      }
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
        setExportBusy(false);
      }
    }
  };

  useEffect(() => {
    if (!project || !autoPrepareRef.current) {
      return;
    }
    autoPrepareRef.current = false;
    const params = new URLSearchParams(window.location.search);
    params.delete("prepare");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    prepareDocuments();
  }, [project]);

  const saveVisibleGrades = (grades) => {
    setVisibleGrades(grades);
    try { localStorage.setItem(`augmentation-visible-grades:${project.id}`, JSON.stringify(grades)); } catch { /* The current page remains usable. */ }
  };

  const addGrades = async () => {
    if (!project || !additionalGrades.length || exportBusy) return;
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportBusy(true);
    setExportStatus(labels.preparingDocuments);
    try {
      const catalog = await loadAugmentationCatalog({ signal: controller.signal });
      const current = await refreshAugmentationProject({ project, catalog, signal: controller.signal });
      const loaded = await loadRecipeSources({ catalog, orderedPartKeys: current.orderedParts.map((part) => part.key), gradeSlugs: additionalGrades, signal: controller.signal });
      const extra = buildAugmentationProject({ id: current.id, title: current.title, catalogRevision: catalog.catalogRevision, basePart: current.orderedParts.find((part) => part.key === current.basePartKey), orderedParts: current.orderedParts, gradeSlugs: additionalGrades, ...loaded });
      const failures = Object.values(extra.gradeResults).filter((result) => result.status !== "ready");
      if (failures.length) throw new Error(failures.map((result) => `${result.gradeSlug}: ${result.error}`).join("; "));
      const candidate = { ...current, selectedGrades: [...new Set([...current.selectedGrades, ...additionalGrades])], gradeResults: { ...current.gradeResults, ...extra.gradeResults } };
      const created = await createExportJob(candidate, { signal: controller.signal });
      const ready = await pollExportJob(created.id, { signal: controller.signal });
      const saved = await storage.saveProject(candidate, { expectedRevision: project.revision });
      setProject(saved);
      setExportJob(ready);
      writeCachedExportJob(saved, ready);
      saveVisibleGrades([...new Set([...visibleGrades, ...additionalGrades])]);
      setAdditionalGrades([]);
      closeDialog(addGradesDialogRef.current);
      setExportStatus(labels.exportsReady);
    } catch (error) {
      if (error.name !== "AbortError") setExportStatus(`${labels.exportFailed} ${error.code === "export-service-unavailable" ? labels.exportServiceUnavailable : error.message}`);
    } finally {
      if (exportAbortRef.current === controller) { exportAbortRef.current = null; setExportBusy(false); }
    }
  };

  const documentAction = (gradeSlug, documentType) => {
    const formats = [["docx", labels.word], ["pdf", labels.pdf], ["mobile-pdf", labels.mobilePdf]];
    const available = formats.map(([format, text]) => ({ format, text, artifact: findExportArtifact({ artifacts: fileCheck?.artifacts }, gradeSlug, documentType, format) }));
    return <DocumentFormatControl available={available} label={`${labels.format}: ${documentType === "BK" ? labels.flashcard : labels.questionSheet} (${gradeLabels[gradeSlug] ?? gradeSlug})`} actionLabel={labels.openDownload} />;
  };

  const canSaveTitle = Boolean(
    project
    && title.trim()
    && title.trim() !== String(project.title ?? "").trim()
  );

  if (!project) {
    return <p class="empty-state" aria-live="polite">{status || labels.loading}</p>;
  }

  return (
    <div class="personal-augmentation-detail">
      <section class="personal-augmentation-summary">
        <p class="eyebrow">{labels.detailEyebrow}</p>
        <div class="personal-augmentation-title-edit">
          <label>
            <span>{labels.rename}</span>
            <input value={title} onInput={(event) => setTitle(event.currentTarget.value)} />
          </label>
          <button
            class="button-secondary"
            type="button"
            onClick={saveTitle}
            disabled={!canSaveTitle}
          >{labels.save}</button>
        </div>
        <h2>{labels.sourcesHeading}</h2>
        <ol class="augmentation-source-summary">
          {project.orderedParts.map((part) => (
            <li><strong>{part.bookTitle}</strong> · {part.partNo.toUpperCase()} · {part.title}</li>
          ))}
        </ol>
        <div class="personal-augmentations__actions">
          <button class="button-secondary" type="button" onClick={exportProject}>{labels.exportWorkspace}</button>
          <button class="button-secondary button-danger" type="button" onClick={removeProject}>{labels.delete}</button>
        </div>
        {status ? <p class="filter-status" aria-live="polite">{status}</p> : null}
      </section>
      <AugmentedSourceText heading={labels.sourceTextHeading} text={project.sourceText} />

      <aside class="download-panel personal-augmentation-downloads">
        <h2>{labels.downloadsHeading}</h2>
        {exportStatus ? (
          <p class="augmentation-export-status" role="status" aria-live="polite" aria-busy={exportBusy ? "true" : "false"}>
            {exportBusy ? <span class="augmentation-export-status__spinner" aria-hidden="true"></span> : null}
            <span>{exportStatus}</span>
          </p>
        ) : null}
        {fileCheckError ? <p role="alert">{fileCheckError}</p> : null}
        {!fileCheck && !fileCheckError && !exportBusy ? <p role="status">{labels.checkingFiles}</p> : null}
        {fileCheck && Object.values(fileCheck.statuses).some((status) => status !== "complete") ? <div class="missing-files-warning" role="status"><p>{labels.missingFilesWarning}</p><button class="button-secondary" type="button" onClick={prepareDocuments} disabled={exportBusy}>{labels.prepareMissingFiles}</button></div> : null}
        <fieldset class="download-grade-filter">
          <legend>{labels.gradeSelection}</legend>
          {AUGMENTATION_GRADE_SLUGS.map((gradeSlug) => <label><input type="checkbox" disabled={project.gradeResults?.[gradeSlug]?.status !== "ready" || !fileCheck || fileCheck.statuses[gradeSlug] === "missing"} checked={visibleGrades.includes(gradeSlug)} onChange={(event) => saveVisibleGrades(event.currentTarget.checked ? [...visibleGrades, gradeSlug] : visibleGrades.filter((grade) => grade !== gradeSlug))} /> {gradeLabels[gradeSlug] ?? gradeSlug}</label>)}
        </fieldset>
        {AUGMENTATION_GRADE_SLUGS.some((grade) => project.gradeResults?.[grade]?.status !== "ready") ? <button class="button-secondary" type="button" onClick={() => { setAdditionalGrades([]); showDialog(addGradesDialogRef.current); }} disabled={exportBusy}>{labels.addGrades}</button> : null}
        <dialog class="augmentation-dialog" ref={addGradesDialogRef} aria-labelledby="add-grades-title">
          <div class="augmentation-dialog__panel">
            <h2 id="add-grades-title">{labels.addGrades}</h2>
            <p>{labels.addGradesHelp}</p>
            <fieldset class="augmentation-grades">
              <legend>{labels.gradeSelection}</legend>
              {AUGMENTATION_GRADE_SLUGS.filter((grade) => project.gradeResults?.[grade]?.status !== "ready").map((grade) => <label><input type="checkbox" checked={additionalGrades.includes(grade)} onChange={(event) => setAdditionalGrades(event.currentTarget.checked ? [...additionalGrades, grade] : additionalGrades.filter((item) => item !== grade))} /> {gradeLabels[grade] ?? grade}</label>)}
            </fieldset>
            {exportStatus ? <p role="status">{exportStatus}</p> : null}
            <footer class="augmentation-dialog__actions"><button class="button-secondary" type="button" onClick={() => closeDialog(addGradesDialogRef.current)} disabled={exportBusy}>{labels.cancel}</button><button class="button" type="button" onClick={addGrades} disabled={exportBusy || !additionalGrades.length}>{labels.prepareGrades}</button></footer>
          </div>
        </dialog>
        {AUGMENTATION_GRADE_SLUGS.filter((grade) => visibleGrades.includes(grade) && project.gradeResults?.[grade]?.status === "ready" && fileCheck && fileCheck.statuses[grade] !== "missing").map((gradeSlug) => {
          const result = project.gradeResults?.[gradeSlug];
          return (
            <details class="download-group">
              <summary class="download-group__summary">
                <span class="download-group__summary-label">{gradeLabels[gradeSlug] ?? gradeSlug}</span>
                <span class="download-group__summary-arrow" aria-hidden="true">›</span>
              </summary>
              <div class="download-group__content">
                {result?.status === "ready" ? (
                  <>
                    <p>{result.selectedQuestionCount} {labels.questionCount} · {result.selectedSets.length} {labels.setCount}</p>
                    <section class="download-material">
                      <header class="download-material__head"><div class="part-row__meta">{labels.flashcard}</div></header>
                      <div class="download-study-action"><a class="button" href={localStudyPath(project.id, gradeSlug, locale)}>{labels.study}</a></div>
                      {documentAction(gradeSlug, "BK")}
                    </section>
                    <section class="download-material">
                      <header class="download-material__head"><div class="part-row__meta">{labels.questionSheet}</div></header>
                      {documentAction(gradeSlug, "SK")}
                    </section>
                  </>
                ) : result?.status === "failed" ? (
                  <p class="empty-state">{labels.failedGrade} {result.error}</p>
                ) : (
                  <p class="empty-state">{labels.inactiveGrade}</p>
                )}
              </div>
            </details>
          );
        })}
      </aside>
    </div>
  );
}
