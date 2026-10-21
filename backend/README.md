# KYC LOAN APPLICATION

This is an app that manages users and loan applications.

## Running locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
brew install tesseract   # OCR for uploaded documents
```

Copy `website/.env.example` to `website/.env` and fill it in (`DATABASE_URL`, `SECRET_KEY`, SMTP settings). For a throwaway SQLite setup with no real emails:

```bash
DEMO_MODE=True DATABASE_URL=sqlite:///demo.db SECRET_KEY=dev python app.py   # serves on :5000
```

- `app.py` runs `db.create_all()` on startup. Schema changes go through Flask-Migrate (see `runcommands.txt`).
- `pymssql` (in `requirements.txt`) needs build tools; skip it unless you use SQL Server.
- macOS: port 5000 is used by AirPlay Receiver. Run on another port with `python -c "from app import app; app.run(port=5001)"` and point the frontend proxy at it.
- `python demo_seeder.py` resets `instance/demo.db` and seeds admin, HR and finance users, 2 companies, 5 applicants and 5 applications. Staff logins (password `demo123`): `admin@leocapdemo.com`, `hr@leocapdemo.com`, `finance@leocapdemo.com`; applicants use `password123` (e.g. `sylvia@example.com`). If you change the models, update the seeder to match.
- `app.py` also serves the built frontend from `../frontend/dist`.


## Deployment (GitHub Actions → cPanel)

Pushing to `main` deploys automatically over FTPS: changes under `backend/` run "Deploy backend" (uploads to the API folder and touches `tmp/restart.txt` so Passenger restarts), changes under `frontend/` run "Deploy frontend" (builds and uploads `dist/` to `public_html` and `app.leocapinvest.co.ke`). Both can also be run by hand from the Actions tab. Needs the repo secrets `FTP_API_*`, `FTP_WEB_*`, `FTP_APP_*` (username = full cPanel FTP login).

The deploy never touches `.env`, `.htaccess`, the server's own `app.py`, uploaded documents or databases. It does **not** change the database or install Python packages: a model change needs the SQL in `../db/` applied first, and a new dependency needs installing through cPanel's Setup Python App. See `../db/README.md`.

## Login cookie and `SECRET_KEY`

Logins are a cookie signed with `SECRET_KEY` (set it in `website/.env`; use a long random value: if it is missing the code falls back to a public default, so never deploy without it). The cookie is `Secure`, `HttpOnly` and `SameSite=Lax`, so the frontend and the API must be on the same site (`app.leocapinvest.co.ke` + `api.leocapinvest.co.ke`, or `localhost` + `localhost` in development). A frontend on a different domain, or a local frontend pointed at the live API, will not be logged in: that would need `SameSite=None` plus CSRF tokens in `website/config.py`. Routes that change data accept only PATCH (or POST/DELETE), never GET.

## Emails

The app sends mail through one mailbox: `SENDER_ADDRESS` and `SENDER_PASSWORD` in `website/.env` (production uses `notifications@leocapinvest.co.ke`), over SSL on `mail.leocapinvest.co.ke:465`. `SMTP_HOST` and `SMTP_PORT` are only needed to use another provider; leave them out otherwise. The password is read by python-dotenv, so write it without spaces and avoid `#`, `$`, quotes and backslashes, or wrap it in single quotes. Restart the app after changing `.env`. Nothing is sent when `DEMO_MODE=True`.

What is sent: password reset links (see `forgot_password`), the daily reminder and delinquency emails, the "loan fully repaid" email on bulk mark-as-paid, the "document rejected" email, admin-written emails to applicants, and **a notice to HR when a loan application is created**. That notice goes to the HR staff accounts of the applicant's company (role `hr`, not suspended) and to the address(es) in the company record's `hr_email` field (comma or semicolon separated), each address once; the applicant themselves is never emailed about their own application. It is sent in the background after the application is saved, so a mail problem never blocks or fails an application; failures are only logged. The link in the email is `FRONTEND_URL` + `/hr/applications/pending/<application id>`.

## Daily reminder job (cron)

`POST /api/cron/reminders` is meant to be called **once a day** (cPanel > Cron Jobs). For every disbursed loan that is unpaid or part-paid it emails the borrower 7 days before the due date, 3 days before, on the due date and 7 days after, and on day 8 after the due date it marks the loan `delinquent`, adds a 15% collection fee to the outstanding balance and writes a "Delinquency Collection Fee" ledger row. Each reminder fires on its exact day, so a day the job does not run is a reminder that is never sent.

It is locked behind a secret: set `CRON_SECRET` in the server's `website/.env` (restart the app afterwards) and send it with the call, for example
`curl -s -X POST -H "X-Cron-Secret: <secret>" https://api.leocapinvest.co.ke/api/cron/reminders` (or `?key=<secret>`). Without `CRON_SECRET` the endpoint answers 503, with a wrong one 401.

A delinquent loan can still be paid down from the admin application page (partial payments keep it `delinquent`, so the job never charges the fee twice) marked paid, or moved on like any overdue loan (Mark as Default, then Escalate). Rollover interest ("Charge Interest") is not offered on a delinquent loan.

## API Documentation

## Users

Base url

```http
/api/auth/users
```

#### Endpoint: register

```http
  POST /register
```
#### Request body

```http
{
    "name":"Moses Ndungu",
    "email":"moisendungu@gmail.com",
    "number":"0746029603",
    "password":"password",
    "role":"admin" //allowed roles are "admin"  //no caps
}
```

#### Endpoint: login

```http
  POST /login
```
#### Request body

```http
 
{
    "email":"moisendungu@gmail.com",
    "password":"password"
}
```

#### Endpoint: delete

```http
  DELETE /delete/{id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of user to delete |

#### Endpoint: update

```http
  PATCH /update/{id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of user to update |

#### Request body

```http
{
    "name":"Moses Ndungu",
    "email":"moisendungu@gmail.com",
    "number":"0746029603"
}
```
#### Endpoint: forgot_password

```http
  PUT /forgot-password
```

Public. Emails a password reset link to the account (applicants, HR and finance). The answer is always the same ("If an account exists for this email, a password reset link has been sent to it.") whether or not the address is registered; suspended accounts get no email. At most one email per address per minute and 100 per hour overall (counted per server process). The link is `FRONTEND_URL` + `/reset-password?token=...` (`FRONTEND_URL` in `website/.env`, default `https://app.leocapinvest.co.ke`; it is never taken from the request). The token is signed with `SECRET_KEY`, valid for 60 minutes and works once (it stops working as soon as the password changes). Email sending needs `SENDER_ADDRESS`, `SENDER_PASSWORD` (and optionally `SMTP_HOST`, `SMTP_PORT`) in `website/.env`.

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email`      | `string` | **Required**. Email of the user trying to login |

#### Request body

```http
{
    "email":"moisendungu@gmail.com"
}
```
#### Endpoint: reset_password

```http
  POST /reset-password
```

Public. Sets a new password from the emailed link.

#### Request body

```http
{
    "token":"<token from the link>",
    "new_password":"at least 6 and at most 128 characters"
}
```
A bad, tampered, used or expired token answers 400 "This reset link is invalid or has expired". Admin accounts (the `users` table) have no self-service reset.

#### Endpoint: change_password

```http
  PUT /change-password
```
#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `temp_password`      | `string` | **Required**. Emailed password |
| `new_password`      | `string` | **Required**. New password |
| `confirm_new_password`      | `string` | **Required**. Confirmation password |

#### Request body

```http
{
    "temp_password":"37283b2dn23",
    "new_password":"password",
    "confirm_new_password":"password",
}
```
## Applicants

Base url

```http
/api/auth/applicant
```

#### Endpoint: register

```http
  POST /register
```
#### Request body

```http
{
    "name":"Moses Githaiga",
    "phone_number":"0719598888",
    "email":"githaigamoses01@gmail.com",
    "password":"passcode",
    "applicant_type":"ideon", //no caps
    "role":"applicant"// allowed roles are applicant, hr and finance  //no caps
}
```

#### Endpoint: login

```http
  POST /login
```
#### Request body

```http
 
{
    "email":"githaigamoses01@gmail.com",
    "password":"passcode"
}
```

#### Endpoint: delete

```http
  DELETE /delete/{id}
```

#### Permissions
```http
Admin role
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of applicant to delete |

#### Endpoint: update

```http
    PATCH /update/{id}
```

#### Permissions
```http
Admin (any applicant) or the applicant / HR / finance user themselves (own profile only)
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of applicant to update |

#### Form-data

```http
name, email, phone_number, id_number, kra_pin, payroll_number = Text // only these fields are applied; any other field is ignored (loan limit, interest rate, company and status are set by admins through their own routes)
files = File // accepted types are .pdf, .xls, .xlsx, .jpg, .jpeg & .png, applicant documents to upload
```
Names cannot contain `/`, `\` or control characters. A blank `name`, `email` or `phone_number` is ignored, and an email already used by another account answers 409. Uploaded files are stored under `applicant_documents/<applicant id>/` (loan documents under `application_documents/<application id>/`); the folder never comes from a name or from anything the browser sends.
#### Endpoint: forgot_password

```http
  PUT /forgot-password
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email`      | `string` | **Required**. Email of the user trying to login |

#### Request body

```http
{
    "email":"moisendungu@gmail.com"
}
```
#### Endpoint: change_password

```http
  PUT /change-password
```
#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `temp_password`      | `string` | **Required**. Emailed password |
| `new_password`      | `string` | **Required**. New password |
| `confirm_new_password`      | `string` | **Required**. Confirmation password |

#### Request body

```http
{
    "temp_password":"37283b2dn23",
    "new_password":"password",
    "confirm_new_password":"password",
}
```
#### Endpoint: set_loan_limit

```http
    PATCH /loan-limit/{id}
```

#### Permissions
```http
Admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of applicant to update |

#### Request body

```http
{
    "loan_limit":"20000"
}
```

`loan_limit` is the most the applicant can apply for in one application, a whole number of shillings (a number or numeric text; surrounding spaces are fine). An empty value, `null` or `0` removes the limit. Anything else (negative, decimals, text, 1,000,000,000 or more, or a missing `loan_limit`) answers 400 with a message and leaves the limit unchanged. Admins set it on the applicant's details page (Manage Applicants).

#### Endpoint: set_interest_rate

```http
    PATCH /interest-rate/{id}
```

#### Permissions
```http
Admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of applicant to update |

#### Request body

```http
{
    "interest_rate":"2.0"
}
```
## Applications

Base url

```http
/api
```

#### Endpoint: create_application

```http
  POST /applications
```
#### Permissions
```http
Applicant
```

**Rate and amount rules.** `amount_applied` must be a number above 0 (and below 1,000,000,000), otherwise the answer is 400 "Please enter a valid loan amount."; if the applicant has a `loan_limit` above 0, a larger amount is refused with a 400 that names the limit. The `interest_rate` sent in the form is **not used**: every application starts at the applicant's company rate (`companies.interest_rate`, in percent, edited on the Companies page; 10% if it is missing or negative). If the form's value differs, or is missing or not a number, the application is still created at the company rate and an `interest_rate` entry ("sent X, used Y", by the applicant) is added to the application's audit trail and logged as a warning. The real terms are set afterwards by an admin ("Set loan terms").

#### Form-data

```http
employment_type = Text //no caps
employment_nature = Text //no caps
company = Text //no caps
payroll_number = Text
designation = Text
is_first_time_applicant = Text //true or false(no caps)
month_one = Text
month_two = Text
month_three = Text
loan_type = Text //no caps
loan_purpose = Text
amount_applied = Text
processing_fees = Text
disbursement_amount = Text
repayment_amount = Text
interest_rate = Text
document_passcode = Text
hr_email_subject = Text
hr_email_body = Text
files = File // accepted types are .pdf, .xls & .xlsx, application documents to upload
```

#### Endpoint: get_all

```http
  GET /applications/get-all
```

#### Permissions
```http
Authenticated user
```


#### Endpoint: get_hr_all / get_finance_all

```http
  GET /applications/get-hr-all
  GET /applications/get-finance-all
```

Loans applied for by HR staff (`get-hr-all`) or by finance staff (`get-finance-all`), newest first, in the same shape as `get-all` (`application` + `bio_data`). Staff of that role only get their own loans (HR on `get-hr-all`, finance on `get-finance-all`); the other role (finance on `get-hr-all`, HR on `get-finance-all`) gets all of them for their own company, and an admin gets every company's. `bio_data` carries the name as both `name` and `full_name`.

#### Permissions
```http
admin, hr, finance
```


#### Endpoint: get_one

```http
  GET /applications/get-one/{application_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to fetch |

#### Endpoint: partial_update

```http
    PATCH /applications/update/{application_id}
```

#### Permissions
```http
Applicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to update |

#### Request body

#### Form-data

```http
any of the application fields = Text
files = File // accepted types are .pdf, .xls & .xlsx, application documents to update
```

#### Endpoint: amend_hr

```http
    PATCH /applications/hr/amend/<string:application_id>
```

Changes the amount of a loan that is waiting for review (status `pending_processing` or `amended`). Processing and access fees, the disbursement and the repayment are worked out again from the new amount, the status becomes `amended`, and the change is written to the audit trail and the ledger. HR and finance only reach their own company's loans and never their own loan, and a role does not amend its own role's loans (HR amends applicants' and finance staff's loans, finance amends applicants' and HR staff's). The applicant's loan limit still applies. Errors come back as `{"message": ...}` with 400 (invalid amount, same amount, amount too small for the fees, over the loan limit, loan not waiting for review), 403 or 404.

#### Permissions
```http
hr
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to amend |

#### Request body

```http
{
    "amount_applied":"20000"
}
```

#### Endpoint: amend_finance

```http
    PATCH /applications/finance/amend/<string:application_id>
```

Same rules as `amend_hr`, for finance users.

#### Permissions
```http
finance
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to amend |

#### Request body

```http
{
    "amount_applied":"20000"
}
```
#### Endpoint: approve

```http
    PATCH /applications/approve/<string:application_id>
```

#### Permissions
```http
admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to approve |

#### Endpoint: reject

```http
    PATCH /applications/reject/<string:application_id>
```

#### Permissions
```http
admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to reject |

#### Endpoint: delete

```http
    DELETE /applications/delete/{application_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to delete |

#### Endpoint: mark_as_default

```http
    PATCH /applications/default/<string:application_id>
```

#### Permissions
```http
admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to default |

#### Endpoint: mark_as_paid

```http
    PATCH /applications/paid/<string:application_id>
```

#### Permissions
```http
admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to mark as paid |
                         
#### Endpoint: escalate

```http
    GET /applications/escalate/<string:application_id>
```

#### Permissions
```http
admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to escalate |

## Applicant Documents

Base url

```http
/api/applicant
```

#### Endpoint: upload_applicant_documents

```http
    POST /documents/{application_id}
```

#### Permissions
```http
Applicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of applicant to add documents |

#### Form-data

```http
files = File // accepted types are .pdf, .xls & .xlsx
```

#### Endpoint: update_applicant_document

```http
    PUT /documents/update-doc/{doc_id}
```

#### Permissions
```http
Applicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of Document to replace |

#### Form-data

```http
file = File // accepted types are .pdf, .xls & .xlsx
```

#### Endpoint: get_documents_by_applicant

```http
    GET /documents/get-by-applicant/<string:applicant_id>
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of applicant with attached documents |

#### Endpoint: get_applicant_document

```http
    GET /documents/get-one/{doc_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to fetch|

#### Endpoint: download_applicant_document

```http
    GET /documents/download/{doc_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to download|

#### Endpoint: delete_applicant_document

```http
    DELETE /documents/delete/{doc_id}
```

#### Permissions
```http
Aplicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to delete|

## Application Documents

Base url

```http
/api/application
```

#### Endpoint: upload_document

```http
    POST /documents/{application_id}
```

#### Permissions
```http
Applicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of applicant to add documents |

#### Form-data

```http
document_passcode = Text
files = File // accepted types are .pdf, .xls & .xlsx
```

#### Endpoint: update_document

```http
    PUT /documents/update-doc/{doc_id}
```

#### Permissions
```http
Applicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of Document to replace |

#### Form-data

```http
file = File // accepted types are .pdf, .xls & .xlsx
```

#### Endpoint: get_documents_by_application

```http
    GET /documents/get-by-application/<string:applicant_id>
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of applicant with attached documents |

#### Endpoint: get_document

```http
    GET /documents/get-one/{doc_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to fetch|

#### Endpoint: download_document

```http
    GET /documents/download/{doc_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to download|

#### Endpoint: delete_document

```http
    DELETE /documents/delete/{doc_id}
```

#### Permissions
```http
Aplicant
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to delete|

## Emails

Base url

```http
/api/application
```

#### Endpoint: create_email

```http
    POST /emails/create-email/{application_id}
```

#### Permissions
```http
Admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to add email message |

#### Form-data

```http
confirmation_text = Text
subject = Text
files = File
```

#### Endpoint: get_email

```http
    GET /emails/get-email/{email_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of email to fetch |

#### Endpoint: get_hr_email

```http
    GET /emails/get-hr-email/{email_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of hr email to fetch |

#### Endpoint: get_hr_emails_per_application

```http
    GET /emails/get-hr-emails-per-application/{applicaton_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to fetch hr emails |

#### Endpoint: get_emails_per_application

```http
    GET /emails/get-emails-per-application/{applicaton_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to fetch emails |

#### Endpoint: delete_email

```http
    DELETE /emails/delete-email/{email_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of email to delete |

#### Endpoint: delete_email

```http
    PATCH /emails/edit-email/{email_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of email to edit |

#### Form-data

```http
any of the email fields = Text
files = File
```

#### Endpoint: upload-confirmation-document

```http
    POST /emails/confirmation-document/{email_id}
```

#### Permissions
```http
Admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of email to add documents |

#### Form-data

```http
files = File // accepted types are .pdf, .jpeg, .jpg & .png
```

#### Endpoint: get_documents_by_email

```http
    GET /emails/confirmation-document/get-by-email/{email_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of email with attached documents |

#### Endpoint: get_confirmation_document

```http
    GET /emails/confirmation-document/get-one/{doc_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to fetch|

#### Endpoint: download_confirmation_document

```http
    GET /email/confirmation-document/download/{doc_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to download|

#### Endpoint: delete_confirmation_document

```http
    DELETE /emails/confirmation-document/delete/{doc_id}
```

#### Permissions
```http
Admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `doc_id`      | `string` | **Required**. Id of document to delete|

#### Endpoint: send_email

```http
    POST /send-email/{email_id}
```

#### Permissions
```http
Admin
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `email_id`      | `string` | **Required**. Id of email to send|

#### Endpoint: send_hr_email

```http
    POST /send-hr-email/{application_id}
```

#### Permissions
```http
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `application_id`      | `string` | **Required**. Id of application to notify hr|

#### Request body

```http
{
    "subject":"This is a sample subject",
    "body":"This is a sample confirmation message"
}
```
## Reports

Base url

```http
/api/reports
```

#### Endpoint: get_applications_report

```http
    GET /applications/get_all/
```

#### Permissions
```http
admin, hr, finance
```

| Query | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `company`      | `string` | **Optional**|
| `employment_type`      | `string` | **Optional**|
| `loan_status`      | `string` | **Optional**|
| `repayment_status`      | `string` | **Optional**|
| `hr_status`      | `string` | **Optional**|
| `created_at`      | `string` | **Optional**|
| `company`      | `string` | **Optional**|
| `page`      | `string` | **Optional** Default = 1|
| `page_size`      | `string` | **Optional** Default = 10|

#### Endpoint: get_all_disbursed_ideon

```http
    GET /applications/get_all/disbursed/ideon
```

#### Permissions
```http
admin
```
#### Endpoint: get_all_disbursed_nakama

```http
    GET /applications/get_all/disbursed/nakama
```

#### Permissions
```http
admin
```

#### Endpoint: repayment report (PDF)

```http
    GET /applications/get-all/repayment/nakama/pdf
    GET /applications/get-all/repayment/ideon/pdf
    GET /applications/get-all/repayment/company/<code or id>/pdf   // any company ("all" for every company)
```

#### Permissions
```http
admin, hr, finance
```

| Query | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `month`      | `string` | **Optional** Month name, default = this month |
| `start_date`, `end_date`      | `string` | **Optional** `YYYY-MM-DD`, replaces `month` |

The unpaid, disbursed loans of one company as a one-page landscape PDF (`CompanyReportPDFGenerator.generate_repayment_report` in `report_service.py`): the same format for admin and HR/finance. A long list is scaled down to stay on one page. The payment instructions name the Leocap account, except the Nakama route, which names Nakama's own account. 404 with `{"message": ...}` when nothing is due.



