import contextlib
import os


@contextlib.contextmanager
def chdir(wd):
    cwd = os.getcwd()
    os.chdir(wd)
    try:
        yield wd
    finally:
        os.chdir(cwd)
