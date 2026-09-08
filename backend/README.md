# KYC LOAN APPLICATION

This is an app that manages users and loan applications.




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
Authenticated user
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of applicant to update |

#### Form-data

```http
any of applicant fields = Text including payroll_number
files = File // accepted types are .pdf, .xls & .xlsx, applicant documents to upload
```
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



