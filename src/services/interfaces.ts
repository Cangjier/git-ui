export type Guid = string;
export type DateTime = string;

export interface IUserInfomation {
    isLogin: boolean,
    name?: string,
    id?: string,
    email?: string,
    avatar_url?: string,
    html_url?: string
}

export interface ILoginInfo {
    username: string,
    password: string,
    remember: boolean
}

export interface IProgress {
    dateTime?: string,
    progress: number,
    message?: string,
    parentID?: string,
    id?: string,
    status?: 'todo' | 'doing' | 'success' | 'failed',
    data?: any
}

export interface ILocation {
    x: number | "left" | "right" | "center" | string,
    y: number | "top" | "bottom" | "center" | string,
    width: number | string,
    height: number | string,
}

export interface ICommonFolder {
    name: string,
    type: "disk" | "user",
    path: string,
    icon?: string
}

export interface IFolderItem {
    name: string;
    type: "file" | "directory";
    path: string;
    modifyTime: string;
}


export interface IGitChange {
    path: string;
    status: "deleted" | "modified" | "untracked";
}

export interface IGitLog {
    hash: string;
    author: string;
    date: string;
    message: string[];
}

export interface IGitCommit {
    hash: string; // 提交哈希
    author: string; // 作者
    date: string; // 提交日期
    message: string[]; // 提交信息（多行）
    parents?: string[]; // 父提交哈希（可选，合并提交时有多个）
    refs?: string[]; // 关联的引用（如分支、tag，通常可选）
}

export interface IGitBranch {
    type: "local" | "remote"; // 分支类型
    name: string;             // 分支名称
    lastCommit: IGitCommit;
    ref?: {                   // 可选，分支引用信息
        name: string;         // 引用名称
        remoteName?: string;  // 远程名称（可选）
        fetchUrl?: string;        // 远程 fetch 地址
        pushUrl?: string;         // 远程 push 地址
        lastCommit: IGitCommit;
    };
}

export interface INeuecaxWorkspace {
    name: string;
    branch: string;
    no_sparse: boolean;
    path: string;
    ref: string;
    remote: string;
}