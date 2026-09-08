import importlib.machinery
import importlib.util
import os
import sys


sys.path.insert(0, os.path.dirname(__file__))

def load_source(modname, filename):
    loader = importlib.machinery.SourceFileLoader(modname, filename)
    spec = importlib.util.spec_from_file_location(modname, filename, loader=loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module
    
import sys
sys.path.insert(0, '/home/leocapin/api.leocapinvest.co.ke')
from app import app as application