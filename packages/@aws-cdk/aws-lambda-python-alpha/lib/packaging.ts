import * as fs from 'fs';
import * as path from 'path';

export enum DependenciesFile {
  PIP = 'requirements.txt',
  POETRY = 'poetry.lock',
  PIPENV = 'Pipfile.lock',
  UV = 'uv.lock',
  NONE = '',
}

export interface PackagingProps {
  /**
   * Dependency file for the type of packaging.
   */
  readonly dependenciesFile: DependenciesFile;
  /**
   * Command to export the dependencies into a pip-compatible `requirements.txt` format.
   *
   * @default - No dependencies are exported.
   */
  readonly exportCommand?: string;
}

export interface PoetryPackagingProps {
  /**
   * Whether to export Poetry dependencies with hashes. Note that this can cause builds to fail if not all dependencies
   * export with a hash.
   *
   * @see https://github.com/aws/aws-cdk/issues/19232
   * @default Hashes are NOT included in the exported `requirements.txt` file.
   */
  readonly poetryIncludeHashes?: boolean;

  /**
   * Whether to export Poetry dependencies with source repository urls.
   *
   * @default URLs are included in the exported `requirements.txt` file.
   */
  readonly poetryWithoutUrls?: boolean;
}

export class Packaging {
  /**
   * Standard packaging with `pip`.
   */
  public static withPip(): Packaging {
    return new Packaging({
      dependenciesFile: DependenciesFile.PIP,
    });
  }

  /**
   * Packaging with `pipenv`.
   */
  public static withPipenv(): Packaging {
    return new Packaging({
      dependenciesFile: DependenciesFile.PIPENV,
      // By default, pipenv creates a virtualenv in `/.local`, so we force it to create one in the package directory.
      // At the end, we remove the virtualenv to avoid creating a duplicate copy in the Lambda package.
      exportCommand: `PIPENV_VENV_IN_PROJECT=1 pipenv requirements > ${DependenciesFile.PIP} && rm -rf .venv`,
    });
  }

  /**
   * Packaging with `poetry`.
   */
  public static withPoetry(props?: PoetryPackagingProps) {
    return new Packaging({
      dependenciesFile: DependenciesFile.POETRY,
      // Export dependencies with credentials available in the bundling image.
      exportCommand: [
        'poetry', 'export',
        ...props?.poetryIncludeHashes ? [] : ['--without-hashes'],
        ...props?.poetryWithoutUrls ? ['--without-urls'] : [],
        '--with-credentials',
        '--format', DependenciesFile.PIP,
        '--output', DependenciesFile.PIP,
      ].join(' '),
    });
  }

  /**
   * Packaging with `uv`.
   */
  public static withUv() {
    return new Packaging({
      dependenciesFile: DependenciesFile.UV,
      exportCommand: `uv export --frozen --no-emit-workspace --no-dev --no-editable -o ${DependenciesFile.PIP}`,
    });
  }

  /**
   * No dependencies or packaging.
   */
  public static withNoPackaging(): Packaging {
    return new Packaging({ dependenciesFile: DependenciesFile.NONE });
  }

  public static fromEntry(entry: string, poetryIncludeHashes?: boolean, poetryWithoutUrls?: boolean): Packaging {
    if (fs.existsSync(path.join(entry, DependenciesFile.PIPENV))) {
      return this.withPipenv();
    } if (fs.existsSync(path.join(entry, DependenciesFile.POETRY))) {
      return this.withPoetry({ poetryIncludeHashes, poetryWithoutUrls });
    } else if (fs.existsSync(path.join(entry, DependenciesFile.PIP))) {
      return this.withPip();
    } else if (fs.existsSync(path.join(entry, DependenciesFile.UV))) {
      return this.withUv();
    } else {
      return this.withNoPackaging();
    }
  }

  public readonly dependenciesFile: string;
  public readonly exportCommand?: string;
  constructor(props: PackagingProps) {
    this.dependenciesFile = props.dependenciesFile;
    this.exportCommand = props.exportCommand;
  }
}
