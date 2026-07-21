import json
import os
import sys
import time

import uno
from com.sun.star.beans import PropertyValue


def prop(name, value):
    item = PropertyValue()
    item.Name = name
    item.Value = value
    return item


def connect(host, port, attempts=60):
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    url = f"uno:socket,host={host},port={port};urp;StarOffice.ComponentContext"

    for _ in range(attempts):
        try:
            return resolver.resolve(url)
        except Exception:
            time.sleep(0.5)

    raise RuntimeError("Could not connect to LibreOffice UNO listener")


def set_mobile_page_styles(doc, width, height, margin):
    style_families = doc.getStyleFamilies()
    page_styles = style_families.getByName("PageStyles")

    for style_name in page_styles.getElementNames():
        style = page_styles.getByName(style_name)
        for name, value in (
            ("Width", width),
            ("Height", height),
            ("LeftMargin", margin),
            ("RightMargin", margin),
            ("TopMargin", margin),
            ("BottomMargin", margin),
        ):
            try:
                style.setPropertyValue(name, value)
            except Exception:
                pass


def export_pdf(desktop, job, width, height, margin):
    input_url = uno.systemPathToFileUrl(os.path.abspath(job["input"]))
    output_url = uno.systemPathToFileUrl(os.path.abspath(job["output"]))
    document = desktop.loadComponentFromURL(
        input_url,
        "_blank",
        0,
        (
            prop("Hidden", True),
            prop("ReadOnly", True),
        ),
    )

    if document is None:
        raise RuntimeError(f"Could not open {job['input']}")

    try:
        set_mobile_page_styles(document, width, height, margin)
        document.storeToURL(
            output_url,
            (
                prop("FilterName", "writer_pdf_Export"),
                prop("Overwrite", True),
            ),
        )
    finally:
        document.close(True)


def main():
    if len(sys.argv) != 6:
        raise SystemExit(
            "Usage: libreoffice-mobile-export.py <jobs.json> <width-100th-mm> <height-100th-mm> <margin-100th-mm> <port>"
        )

    jobs_file = sys.argv[1]
    width = int(sys.argv[2])
    height = int(sys.argv[3])
    margin = int(sys.argv[4])
    port = int(sys.argv[5])

    with open(jobs_file, "r", encoding="utf-8") as handle:
        jobs = json.load(handle)

    ctx = connect("127.0.0.1", port)
    service_manager = ctx.ServiceManager
    desktop = service_manager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)

    for index, job in enumerate(jobs, start=1):
        os.makedirs(os.path.dirname(job["output"]), exist_ok=True)
        export_pdf(desktop, job, width, height, margin)
        if index == 1 or index % 25 == 0 or index == len(jobs):
            print(f"[{index}/{len(jobs)}] {job['output']}")


if __name__ == "__main__":
    main()
