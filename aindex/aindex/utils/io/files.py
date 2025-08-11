from ...conf import settings

__all__ = [
    'iter_files',
    'get_tmp_dir'
]


def iter_files(path):
    """
    Generate all files within the specified path recursively.

    To return only specific file paths you can pass a path pattern.

    Example:

        >>> path = Path('/some/path/*.py')
        >>> iter_files(path)
        [PosixPath('/some/path/build/lib/pathlib.py'),
         PosixPath('/some/path/docs/conf.py'),
         PosixPath('/some/path/pathlib.py'),
         PosixPath('/some/path/setup.py'),
         PosixPath('/some/path/test_pathlib.py')]

    Args:
        path (Path):
            Source path

    Yields:
        Path objects
    """

    path = path.expanduser().resolve()

    if path.is_dir():
        for p in path.rglob('*'):
            if p.is_file():
                yield p
    else:
        yield from path.parent.rglob(path.name)


def get_tmp_dir():
    tmp_dir = settings.tmp_dir.expanduser().resolve()
    tmp_dir.mkdir(parents=True, exist_ok=True)
    return tmp_dir
