"""The two loan agreements as they were typed into the application forms until 29 Oct 2026 (the text was moved here unchanged).

This is the ONLY built-in copy: until an admin publishes a text under Site content > Loan agreements, the forms, the acceptance record and
the debt dossier all use it. Each body is a list of lines (a blank string is a blank line). The Salary Advance text is also the one HR and
finance staff accept for their own loans; "{{employer}}" is the borrower's employer, filled in when the agreement is shown.
"""

SALARY_ADVANCE = {
    "title": 'LOAN AGREEMENT',
    "intro": 'This Loan Agreement ("Agreement") is made and deemed executed in Nairobi, Kenya on the date of electronic acceptance by the Borrower.',
    "items": [
        {"title": 'PARTIES', "body": [
            '1. LEOCAP INVEST, a business duly incorporated/registered under the laws of the Republic of Kenya, of P.O. Box 184–00100 GPO, Nairobi (hereinafter referred to as the "Lender", which expression shall include its successors and assigns);',
            '',
            'AND',
            '',
            '2. The Applicant, being the individual whose identification details, employment details, and address are provided in the online application form (hereinafter referred to as the "Borrower", which expression shall include personal representatives and assigns).',
        ]},
        {"title": 'A. LOAN AMOUNT AND DISBURSEMENT', "body": [
            'The Lender agrees to advance to the Borrower a loan amount as approved through the online application system ("Loan Amount").',
            'The Borrower acknowledges that approval is subject to employment verification under the Memorandum of Understanding between the Lender and {{employer}}.',
            'The Borrower shall pay:',
            'A processing fee of 3%, An Admin & Access Fee of 2% of the Loan Amount, and',
            'Legal Fees of KES 1,500',
            'These fees may be deducted upfront from the Loan Amount prior to disbursement.',
        ]},
        {"title": 'B. LOAN LIMIT', "body": [
            "The Borrower's approved loan limit shall be determined solely by the Lender based on internal credit assessment and employer MOU limits.",
            'The Lender reserves the right to review, vary, or revoke the loan limit at its discretion.',
            'The Borrower shall not be entitled to exceed the approved loan limit unless expressly authorized in writing.',
        ]},
        {"title": 'C. LOAN TERM', "body": [
            'The loan shall be for a maximum period of one (1) month, unless otherwise extended or rescheduled in writing by the Lender.',
        ]},
        {"title": 'D. INTEREST', "body": [
            'The Loan shall attract interest at the rate communicated and agreed at the time of approval.',
            'Interest shall accrue monthly and be payable together with the principal unless otherwise agreed.',
        ]},
        {"title": 'E. REPAYMENT', "body": [
            'The Borrower shall repay the Loan Amount together with interest in accordance with the repayment schedule provided.',
            'Repayment shall be effected through salary deduction under the employer check-off arrangement pursuant to the MOU with {{employer}}.',
            'Any unpaid balance shall continue to accrue interest at the contractual rate until fully settled.',
        ]},
        {"title": 'F. DEFAULT', "body": [
            'An event of default occurs when the Borrower fails to pay any instalment on its due date.',
            'Upon default:',
            'a. The overdue instalment may be rescheduled subject to a rescheduling fee of 10% of the instalment or KES 1,500 (whichever is higher);',
            'b. A debt recovery fee of 15% of the outstanding balance may be charged after 7 days of default and issuance of demand notice;',
            'c. A late-payment charge of 10% of the outstanding balance may be charged after 7 days of default;',
            'd. Returned or unpaid cheques shall attract actual bank charges or KES 3,000 (whichever is higher) plus 15% collection fee.',
            'The Lender reserves the right to engage third-party debt collection agents or legal counsel for recovery.',
        ]},
        {"title": 'G. DATA PROTECTION AND DISCLOSURE CONSENT', "body": [
            'The Borrower expressly consents to the collection, processing, storage, and sharing of their personal and employment data strictly for purposes of:',
            'Loan assessment and administration;',
            'Salary verification and check-off processing;',
            'Debt recovery and enforcement.',
            'The Borrower acknowledges that data may be shared with:',
            '{{employer}} (employer);',
            'Authorized debt collection agents;',
            'Legal practitioners; and',
            'Regulatory authorities where required by law.',
            'All processing shall comply with the Data Protection Act, 2019 of Kenya.',
        ]},
        {"title": 'H. DISPUTE RESOLUTION', "body": [
            'Any dispute arising shall first be resolved amicably through negotiation.',
            'If unresolved, the dispute shall be referred to the courts of competent jurisdiction in Kenya.',
        ]},
        {"title": 'I. ELECTRONIC ACCEPTANCE', "body": [
            'The Borrower agrees that ticking acceptance on the online portal constitutes a legally binding electronic signature under Kenyan law.',
            'The Borrower confirms they have read, understood, and accepted all terms herein.',
        ]},
        {"title": 'J. ENTIRE AGREEMENT', "body": [
            'This Agreement constitutes the entire understanding between the parties and supersedes all prior representations or agreements.',
        ]},
    ],
}

PERSONAL_LOAN = {
    "title": 'LOAN AGREEMENT',
    "intro": 'This Loan Agreement ("Agreement") is made and deemed executed in Nairobi, Kenya on the date of electronic acceptance by the Borrower.',
    "items": [
        {"title": 'PARTIES', "body": [
            'LEOCAP INVEST, a business duly registered under the laws of Kenya, of P.O. Box 184–00100 GPO, Nairobi (the "Lender");',
            '',
            'AND',
            '',
            'The Applicant, being the individual whose identification and personal details are provided in the online application (the "Borrower").',
        ]},
        {"title": 'A. LOAN AMOUNT AND DISBURSEMENT', "body": [
            'The Lender agrees to advance to the Borrower a loan amount approved through the application system ("Loan Amount").',
            'The Borrower acknowledges receipt and acceptance of the Loan Amount upon disbursement.',
            'The Borrower shall pay:',
            'A processing fee of 3% of the Loan Amount, and',
            'A legal/administration fee of KES 1,000',
            'which may be deducted from the Loan Amount prior to disbursement or charged separately as determined by the Lender.',
        ]},
        {"title": 'B. INTEREST', "body": [
            'The Loan shall attract interest at the rate communicated and accepted at approval.',
            'Interest shall accrue on a reducing or flat balance basis as disclosed at the time of approval.',
        ]},
        {"title": 'C. REPAYMENT', "body": [
            'The Borrower shall repay the Loan Amount together with interest in monthly instalments as communicated in the repayment schedule.',
            'The Borrower shall remain fully liable until the Loan is repaid in full.',
            'Early repayment shall be permitted unless otherwise stated in the repayment terms.',
        ]},
        {"title": 'D. DEFAULT', "body": [
            'An event of default occurs if the Borrower fails to pay any instalment on its due date.',
            'Upon default:',
            'a. The outstanding amount shall continue to accrue interest at the contractual rate.',
            'b. A late payment penalty may be charged as communicated at approval.',
            'c. A restructuring fee of 10% of the overdue instalment or KES 1,500 (whichever is higher) may apply where repayment arrangements are revised.',
            'd. A late-payment charge of 10% of the outstanding balance may be charged after 7 days of default.',
            'The Lender may initiate recovery action, including engagement of third-party debt collectors or legal proceedings.',
        ]},
        {"title": 'E. CHEQUE / PAYMENT DEFAULTS', "body": [
            'Returned or dishonoured payments shall attract:',
            'Actual bank charges or KES 3,000 (whichever is higher), and',
            'A collection fee of up to 15% of the dishonoured amount.',
        ]},
        {"title": 'F. DATA PROTECTION AND INFORMATION SHARING', "body": [
            'The Borrower consents to the collection, processing, storage, and use of personal data in accordance with the Data Protection Act, 2019 of Kenya.',
            'The Borrower consents to disclosure of relevant information to:',
            'Credit reference bureaus (CRBs);',
            'Debt collection agents;',
            'Legal advisors and courts; and',
            'Regulatory authorities where required by law.',
            'Data shall be processed strictly for credit assessment, loan administration, and recovery purposes.',
        ]},
        {"title": 'G. DISPUTE RESOLUTION', "body": [
            'Parties shall first attempt amicable resolution.',
            'Failing settlement, disputes shall be submitted to courts of competent jurisdiction in Kenya.',
        ]},
        {"title": 'H. ELECTRONIC ACCEPTANCE', "body": [
            'The Borrower agrees that electronic acceptance (click-wrap or digital signature) constitutes a legally binding signature under Kenyan law.',
            'System logs and application records shall serve as evidence of acceptance.',
        ]},
        {"title": 'I. ENTIRE AGREEMENT', "body": [
            'This Agreement constitutes the entire agreement between the parties and supersedes all prior representations.',
        ]},
        {"title": 'J. LIMITATION OF LIABILITY', "body": [
            'Nothing in this Agreement shall be construed as limiting any rights of the Borrower or Lender under applicable law.',
        ]},
    ],
}
