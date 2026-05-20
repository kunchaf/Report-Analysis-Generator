import os
import tempfile
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
# pyrefly: ignore [missing-import]
from xhtml2pdf import pisa

# Path to templates directory
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


async def generate_pdf(analysis_data: dict) -> str:
    """
    Render the report HTML template with analysis data and
    convert it to a PDF file using xhtml2pdf. Returns the path to the temp PDF file.
    """
    template = jinja_env.get_template("report.html")
    html_content = template.render(
        topic=analysis_data["topic"],
        generated_at=analysis_data["generated_at"],
        perspectives=analysis_data["perspectives"],
    )

    # Write to a temporary PDF file
    tmp = tempfile.NamedTemporaryFile(
        delete=False, suffix=".pdf", prefix="raig_report_"
    )
    tmp_path = tmp.name
    
    # xhtml2pdf writes to the file directly
    pisa_status = pisa.CreatePDF(html_content, dest=tmp)
    tmp.close()

    return tmp_path
