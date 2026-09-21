import re

path = 'backend/website/company.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the onboarding logic
# We need to find `onboard_company` and replace its body.

old_logic = """
    # 2. Uploaded MOU and Proposal
    files_to_check = ["mou_file", "proposal_file"]
    for f_key in files_to_check:
        if f_key in request.files:
            file_obj = request.files[f_key]
            if file_obj and file_obj.filename != '':
                filename = secure_filename(file_obj.filename)
                # Save to a temporary file
                fd, temp_path = tempfile.mkstemp(suffix="_" + filename)
                os.close(fd)
                file_obj.save(temp_path)
                attachment_paths.append(temp_path)
                temp_files.append(temp_path)
"""

new_logic = """
    # 2. Auto-generate MOU and Proposal
    from website.export_service import generate_company_mou_pdf, generate_company_proposal_pdf
    
    try:
        mou_path = generate_company_mou_pdf(company)
        if mou_path and os.path.exists(mou_path):
            attachment_paths.append(mou_path)
            temp_files.append(mou_path)
            
        proposal_path = generate_company_proposal_pdf(company)
        if proposal_path and os.path.exists(proposal_path):
            attachment_paths.append(proposal_path)
            temp_files.append(proposal_path)
    except Exception as e:
        print("Error generating documents:", str(e))
"""

content = content.replace(old_logic, new_logic)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched company.py with auto-generated docs")
