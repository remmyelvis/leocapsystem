"""Who is in the demo.

Everyone here is fictional: three employers, their HR and finance staff, the lender's own staff and the borrowers. Email
addresses use the reserved ".example" domains, so nothing can ever be delivered to a real person, and the phone, ID and KRA
numbers are made up. The only real names are those of the places and kinds of work, so the demo reads like Kenya.
"""

DOMAIN = "leocapdemo.example"  # the lender's own staff
PERSONAL_DOMAIN = "inbox.example"  # people who borrow on their own, not through an employer
PASSWORD = "demo123"

# days_ago: when the employer joined the platform. The three joined at different times, which is what makes the book of
# loans look like it grew over the year.
COMPANIES = [
    dict(code="savannah", name="Savannah Freight & Logistics Ltd", domain="savannahfreight.example", contact="Mercy Achieng",
         phone="0722 410 201", rate=10.0, days_ago=395, branch="Industrial Area, Nairobi",
         notes="Pays salaries on the last working day. Remits loan deductions by the 5th."),
    dict(code="kilele", name="Kilele Health Group", domain="kilelehealth.example", contact="Nancy Mwikali",
         phone="0733 510 302", rate=10.0, days_ago=300, branch="Upper Hill, Nairobi",
         notes="Hospital group with 4 sites. Remits loan deductions with the monthly payroll."),
    dict(code="tanda", name="Tanda Agro-Processors Ltd", domain="tandaagro.example", contact="Patricia Wanjiru",
         phone="0711 620 403", rate=8.0, days_ago=150, branch="Thika Road, Thika",
         notes="Negotiated an 8% rate under the staff MOU."),
]

# The lender's own staff (the admin side).
LENDER_STAFF = [
    dict(key="credit", name="Wanjiru Ndung'u", title="Head of Credit", phone="0700 100 001"),
    dict(key="collections", name="Amina Said", title="Collections Officer", phone="0700 100 002"),
]

# HR and finance staff of each employer. They are applicants with a staff role, as in the real system.
EMPLOYER_STAFF = [
    dict(role="hr", name="Mercy Achieng", company="savannah", job="HR Manager", salary=95000, key="mercy"),
    dict(role="finance", name="Joseph Kariuki", company="savannah", job="Finance Manager", salary=120000, key="joseph_k"),
    dict(role="hr", name="Nancy Mwikali", company="kilele", job="HR Business Partner", salary=110000, key="nancy"),
    dict(role="finance", name="Gideon Mwangi", company="kilele", job="Finance Controller", salary=135000, key="gideon"),
    dict(role="hr", name="Patricia Wanjiru", company="tanda", job="HR Officer", salary=88000, key="patricia"),
    dict(role="finance", name="Irene Cherotich", company="tanda", job="Accountant", salary=92000, key="irene"),
]

# (key, name, company, job, monthly pay, how reliably they repay). The key is how the story code refers to them.
EMPLOYEES = [
    # Savannah Freight & Logistics
    ("wanjiku", "Wanjiku Kamau", "savannah", "Dispatch Coordinator", 62000, "excellent"),
    ("brian", "Brian Odhiambo", "savannah", "Long-haul Driver", 48000, "good"),
    ("peter", "Peter Mwangi", "savannah", "Warehouse Supervisor", 58000, "fair"),
    ("kevin", "Kevin Kiprop", "savannah", "Fleet Mechanic", 52000, "good"),
    ("esther", "Esther Akinyi", "savannah", "Accounts Clerk", 71000, "excellent"),
    ("daniel", "Daniel Mutua", "savannah", "Driver", 46000, "fair"),
    ("ann", "Ann Njoki", "savannah", "Customer Service Agent", 44000, "good"),
    ("moses", "Moses Wekesa", "savannah", "Loading Foreman", 39000, "good"),
    ("rose", "Rose Atieno", "savannah", "Procurement Officer", 85000, "excellent"),
    ("abdi", "Abdi Hussein", "savannah", "Route Planner", 66000, "good"),
    ("joyce", "Joyce Wambui", "savannah", "Payroll Officer", 78000, "excellent"),
    ("victor", "Victor Omondi", "savannah", "Driver", 45000, "good"),
    ("susan", "Susan Chebet", "savannah", "Operations Analyst", 92000, "excellent"),
    ("george", "George Njuguna", "savannah", "Security Supervisor", 41000, "fair"),
    ("lilian", "Lilian Mueni", "savannah", "Receptionist", 38000, "good"),
    ("collins", "Collins Barasa", "savannah", "Forklift Operator", 43000, "good"),
    # Kilele Health Group
    ("faith", "Faith Chepkoech", "kilele", "Registered Nurse", 78000, "excellent"),
    ("grace", "Grace Wairimu", "kilele", "Pharmacist", 118000, "good"),
    ("dennis", "Dennis Kibet", "kilele", "Clinical Officer", 105000, "good"),
    ("naomi", "Naomi Adhiambo", "kilele", "Lab Technologist", 82000, "excellent"),
    ("mary", "Mary Nyambura", "kilele", "Registered Nurse", 74000, "good"),
    ("john", "John Maina", "kilele", "Radiographer", 96000, "good"),
    ("sharon", "Sharon Jepkorir", "kilele", "Medical Records Officer", 52000, "good"),
    ("ibrahim", "Ibrahim Yusuf", "kilele", "Ambulance Driver", 49000, "fair"),
    ("caroline", "Caroline Akoth", "kilele", "Registered Nurse", 70000, "excellent"),
    ("stephen", "Stephen Musyoka", "kilele", "Biomedical Technician", 88000, "good"),
    ("beatrice", "Beatrice Naliaka", "kilele", "Accounts Officer", 76000, "excellent"),
    ("kelvin", "Kelvin Rotich", "kilele", "Pharmacy Technician", 68000, "good"),
    ("zainab", "Zainab Said", "kilele", "Physiotherapist", 98000, "excellent"),
    ("patrick", "Patrick Ndegwa", "kilele", "Facilities Officer", 55000, "fair"),
    # Tanda Agro-Processors
    ("hassan", "Hassan Mohamed", "tanda", "Line Supervisor", 64000, "good"),
    ("samuel", "Samuel Kiprono", "tanda", "Machine Operator", 42000, "fair"),
    ("rebecca", "Rebecca Cherono", "tanda", "QA Analyst", 79000, "excellent"),
    ("joseph", "Joseph Ouma", "tanda", "Boiler Operator", 47000, "good"),
    ("agnes", "Agnes Mumbi", "tanda", "Packaging Lead", 51000, "good"),
    ("martin", "Martin Kyalo", "tanda", "Maintenance Technician", 56000, "good"),
    ("tabitha", "Tabitha Wangari", "tanda", "Procurement Assistant", 61000, "excellent"),
    ("isaac", "Isaac Lemayian", "tanda", "Logistics Clerk", 45000, "good"),
]

# People who borrow on their own (no employer): (key, name, trade, business name, town, monthly income, reliability)
INDEPENDENTS = [
    ("lucy", "Lucy Njeri", "Salon Owner", "Lucy's Glam Salon", "Ruiru", 85000, "good"),
    ("tom", "Tom Ochieng", "Boda Boda SACCO Chairman", "Ochieng Riders SACCO", "Kisumu", 120000, "excellent"),
    ("carol", "Carol Mwende", "Online Fashion Retailer", "Carol's Closet KE", "Nairobi", 70000, "poor"),
    ("nelson", "Nelson Kiplagat", "Dairy and Maize Farmer", "Kiplagat Dairy Farm", "Eldoret", 95000, "good"),
    ("halima", "Halima Bakari", "Tailor", "Bakari Tailoring", "Mombasa", 60000, "good"),
    ("joel", "Joel Mbugua", "Freelance Graphic Designer", "Mbugua Studio", "Nairobi", 110000, "fair"),
    ("pauline", "Pauline Anyango", "Grocer", "Mama Pauline Greens", "Kisumu", 48000, "fair"),
    ("erick", "Erick Mulwa", "Hardware Shop Owner", "Mulwa Hardware & Supplies", "Machakos", 160000, "excellent"),
]

# Borrowers whose loans are written out by hand in plan.py (the stories). The random history leaves them alone so a story
# never collides with an invented loan.
STORY_KEYS = {
    "wanjiku", "brian", "faith", "hassan", "peter", "grace", "samuel", "daniel", "lucy", "tom", "carol",
    "kevin", "naomi", "rebecca", "mercy",
}

# When each story person joined, in days before today (the rest are spread at random after their employer joined).
JOINED_DAYS_AGO = {
    "wanjiku": 380, "brian": 370, "peter": 375, "daniel": 390, "kevin": 200,
    "faith": 290, "grace": 285, "naomi": 150,
    "hassan": 140, "samuel": 145, "rebecca": 100,
    "lucy": 330, "tom": 340, "carol": 320,
    "mercy": 395, "joseph_k": 395, "nancy": 300, "gideon": 300, "patricia": 150, "irene": 150,
}


def slug(name):
    """first.last, letters only: "Wanjiru Ndung'u" -> "wanjiru.ndungu"."""
    parts = ["".join(c for c in p.lower() if c.isalpha()) for p in name.split()]
    return ".".join(p for p in parts if p)
