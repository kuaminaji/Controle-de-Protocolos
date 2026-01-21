import os
import sys

# Adiciona a raiz do projeto (C:\Protocolos) ao sys.path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)