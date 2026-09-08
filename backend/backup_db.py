import os
import shutil
from datetime import datetime

def backup_sqlite_db():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'instance', 'leocap_local.db')
    backup_dir = os.path.join(base_dir, 'backups')
    
    os.makedirs(backup_dir, exist_ok=True)
    
    if os.path.exists(db_path):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'leocap_local_{timestamp}.db')
        shutil.copy2(db_path, backup_file)
        print(f"Successfully backed up database to {backup_file}")
    else:
        print("Source database not found.")

if __name__ == "__main__":
    backup_sqlite_db()
