import os

from werkzeug.utils import secure_filename


def upload_path(base_dir, folder_id, field_name, filename):
    """(folder, file path) for an uploaded document, built only from cleaned parts.

    The folder is an id, never a person's name (a name can contain "../" or clash with another applicant's), and the file
    is named after the document type plus the uploaded file name. Raises ValueError when the file name is empty after
    cleaning or the result would end up outside base_dir."""
    clean_name = secure_filename(str(filename))
    if not clean_name:
        raise ValueError("Invalid file name")

    folder = os.path.join(base_dir, secure_filename(str(folder_id)))
    path = os.path.join(folder, f"{secure_filename(str(field_name)) or 'file'}_{clean_name}")

    root = os.path.realpath(base_dir)
    if os.path.commonpath([root, os.path.realpath(path)]) != root:
        raise ValueError("Unsafe upload path")
    return folder, path
