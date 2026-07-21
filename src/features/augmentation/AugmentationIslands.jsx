import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { buildDefaultPartOrder, moveOrderedPart } from "./augmentationDomain.js";
import {
  buildAugmentationTitle,
  buildAugmentationProject,
  catalogPartToDomain,
  findCatalogContext,
  findCatalogPartByKey,
  getNeighborPartKeys,
  hydrateProjectSourceText,
  loadAugmentationCatalog,
  loadPartTexts,
  loadRecipeSources
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

export function AugmentationLauncher({ bookSlug, partNo, locale = "tr", labels, gradeLabels = {} }) {
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
      const context = findCatalogContext(loadedCatalog, bookSlug, partNo);
      if (!context) {
        throw new Error(labels.loadError);
      }
      const base = catalogPartToDomain(context.book, context.part, selectionSequence.current++);
      setCatalog(loadedCatalog);
      setBasePart(base);
      setOrderedParts([base]);
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
  const neighborKeys = useMemo(
    () => new Set(basePart && catalog ? getNeighborPartKeys(
      findCatalogPartByKey(catalog, basePart.key)?.book,
      basePart.key
    ) : []),
    [basePart, catalog]
  );

  const togglePart = (book, part, selected) => {
    if (!basePart || part.key === basePart.key) {
      return;
    }
    let next;
    if (selected) {
      next = [...orderedParts, catalogPartToDomain(book, part, selectionSequence.current++)];
    } else {
      next = orderedParts.filter((item) => item.key !== part.key);
    }
    setOrderedParts(manualOrder ? next : buildDefaultPartOrder(basePart, next));
  };

  const selectNeighbors = () => {
    if (!catalog || !basePart) {
      return;
    }
    const additions = [...neighborKeys]
      .filter((key) => !selectedKeys.has(key))
      .map((key) => {
        const context = findCatalogPartByKey(catalog, key);
        return catalogPartToDomain(context.book, context.part, selectionSequence.current++);
      });
    setOrderedParts(buildDefaultPartOrder(basePart, [...orderedParts, ...additions]));
    setManualOrder(false);
  };

  const move = (key, delta) => {
    setOrderedParts(moveOrderedPart(orderedParts, key, delta));
    setManualOrder(true);
  };

  const resetOrder = () => {
    setOrderedParts(buildDefaultPartOrder(basePart, orderedParts));
    setManualOrder(false);
  };

  const toggleGrade = (gradeSlug) => {
    setSelectedGrades((current) => current.includes(gradeSlug)
      ? current.filter((grade) => grade !== gradeSlug)
      : [...current, gradeSlug]);
  };

  const createProject = async () => {
    if (!catalog || !basePart) {
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
        basePart,
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
      window.location.assign(projectDetailPath(saved, locale));
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

  const availableGrades = basePart && catalog
    ? orderAugmentationGradeSlugs(Object.keys(findCatalogPartByKey(catalog, basePart.key)?.part?.grades ?? {}))
    : [];

  return (
    <div class="augmentation-launcher">
      <button class="button" type="button" onClick={open}>{labels.launch}</button>
      <dialog class="augmentation-dialog" ref={dialogRef} aria-labelledby="augmentation-dialog-title" onCancel={cancelDialog}>
        <div class="augmentation-dialog__panel">
          <header class="augmentation-dialog__head">
            <div>
              <p class="eyebrow">{labels.current}</p>
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
                    <button class="button-secondary" type="button" onClick={selectNeighbors}>{labels.selectNeighbors}</button>
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

export function PersonalAugmentationDetail({ bookSlug, locale = "tr", labels, gradeLabels = {} }) {
  const storage = useMemo(() => createAugmentationStorage(), []);
  const exportAbortRef = useRef(null);
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [exportJob, setExportJob] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const restoreCachedDocuments = async (loadedProject, { signal, isActive = () => true } = {}) => {
    const cached = readCachedExportJob(loadedProject);
    if (!cached) {
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
        clearRestoredJob();
      }
    } finally {
      if (isActive()) {
        setExportBusy(false);
      }
    }
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
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
        setProject(loaded);
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
    window.location.assign(locale === "en" ? `/en/books/${bookSlug}/` : `/books/${bookSlug}/`);
  };

  const prepareDocuments = async () => {
    if (!project || exportBusy) return;
    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportBusy(true);
    setExportJob(null);
    setExportStatus(labels.preparingDocuments);
    setStatus("");
    try {
      const created = await createExportJob(project, { signal: controller.signal });
      writeCachedExportJob(project, created);
      const ready = await pollExportJob(created.id, { signal: controller.signal });
      setExportJob(ready);
      setExportStatus(labels.exportsReady);
      writeCachedExportJob(project, ready);
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

  const documentAction = (gradeSlug, documentType, format, text) => {
    const artifact = findExportArtifact(exportJob, gradeSlug, documentType, format);
    return artifact ? (
      <a
        class="button-secondary"
        href={resolveArtifactUrl(artifact, DEFAULT_AUGMENTATION_EXPORT_API)}
        download={artifact.name}
      >{text}</a>
    ) : (
      <button class="button-muted" type="button" disabled title={labels.exportUnavailable}>{text}</button>
    );
  };

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
          <button class="button-secondary" type="button" onClick={saveTitle}>{labels.save}</button>
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
        <button class="button" type="button" onClick={prepareDocuments} disabled={exportBusy}>
          {exportBusy ? labels.preparingDocuments : exportJob ? labels.retryExport : labels.prepareDocuments}
        </button>
        {exportStatus ? (
          <p class="augmentation-export-status" role="status" aria-live="polite" aria-busy={exportBusy ? "true" : "false"}>
            {exportBusy ? <span class="augmentation-export-status__spinner" aria-hidden="true"></span> : null}
            <span>{exportStatus}</span>
          </p>
        ) : null}
        {AUGMENTATION_GRADE_SLUGS.map((gradeSlug) => {
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
                      <div class="download-grid">
                        {documentAction(gradeSlug, "BK", "docx", labels.word)}
                        {documentAction(gradeSlug, "BK", "pdf", labels.pdf)}
                        {documentAction(gradeSlug, "BK", "mobile-pdf", labels.mobilePdf)}
                      </div>
                    </section>
                    <section class="download-material">
                      <header class="download-material__head"><div class="part-row__meta">{labels.questionSheet}</div></header>
                      <div class="download-grid">
                        {documentAction(gradeSlug, "SK", "docx", labels.word)}
                        {documentAction(gradeSlug, "SK", "pdf", labels.pdf)}
                        {documentAction(gradeSlug, "SK", "mobile-pdf", labels.mobilePdf)}
                      </div>
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
