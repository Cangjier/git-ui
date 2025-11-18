import axios from "axios";
import { ICommonFolder, IFolderItem, IGitBranch, IGitChange, IGitCommit, IGitLog, ILoginInfo, INeuecaxWorkspace, IProgress, IUserInfomation } from "./interfaces";
import { BaseServices } from "./baseServices";
const debug = import.meta.env.VITE_DEBUG === "true";
if (debug) {
    console.log("!!! Debug Mode");
}

const LocalServices = () => {
    const base = BaseServices((window as any).webapplication.baseURL ?? "http://localhost:12332");
    const { api, runAsync, run } = base;

    const getUserInfo = async () => {
        let response = await runAsync("user-info-get", {}, (progress: IProgress) => {
            // console.log(progress);
        });
        return response as IUserInfomation;
    }

    const logout = async () => {
        let response = await runAsync("user-logout", {}, (progress: IProgress) => {
            // console.log(progress);
        });
        return response;
    }

    const login = async (username: string, password: string, remember: boolean) => {
        let response = await runAsync("user-login", { username, password, remember }, (progress: IProgress) => {
            // console.log(progress);
        });
        return response as IUserInfomation;
    }

    const getLoginInfo = async () => {
        let response = await runAsync("user-login-info", {}, (progress: IProgress) => {
            // console.log(progress);
        });
        return response as ILoginInfo;
    }

    const getSettings = async () => {
        let response = await runAsync("settings-get", {}, (progress: IProgress) => {
            // console.log(progress);
        });
        return response;
    }

    const fileConstructor = () => {
        const list = async (path: string) => {
            let response = await run("file", {
                action: "list",
                path
            });
            return (response as {
                items: IFolderItem[]
            }).items;
        };
        const read = async (path: string) => {
            let response = await run("file", {
                action: "read",
                path
            });
            return (response as {
                content: string
            }).content;
        };
        const write = async (path: string, content: string) => {
            await run("file", {
                action: "write",
                path,
                content
            });
        };
        const commonFolders = async () => {
            let response = await run("file", {
                action: "common-folders"
            });
            return response as {
                items: ICommonFolder[]
            }
        };
        const directoryExists = async (path: string) => {
            let response = await run("file", {
                action: "directory-exists",
                path
            });
            return (response as {
                exists: boolean
            }).exists;
        };
        const fileExists = async (path: string) => {
            let response = await run("file", {
                action: "file-exists",
                path
            });
            return (response as {
                exists: boolean
            }).exists;
        };
        const createDirectory = async (path: string) => {
            await run("file", {
                action: "create-directory",
                path
            });
        };
        const deleteDirectory = async (path: string) => {
            await run("file", {
                action: "delete-directory",
                path
            });
        };
        const getDirectoryName = async (path: string) => {
            let response = await run("file", {
                action: "get-directory-name",
                path
            });
            return (response as {
                path: string
            }).path;
        };
        const getFileName = async (path: string) => {
            let response = await run("file", {
                action: "get-file-name",
                path
            });
            return (response as {
                name: string
            }).name;
        };
        const getFileExtension = async (path: string) => {
            let response = await run("file", {
                action: "get-file-extension",
                path
            });
            return (response as {
                extension: string
            }).extension;
        };
        const getFileNameWithoutExtension = async (path: string) => {
            let response = await run("file", {
                action: "get-file-name-without-extension",
                path
            });
            return (response as {
                name: string
            }).name;
        };
        const revealFileInExplorer = async (path: string) => {
            path = path.replace(/\//g, "\\");
            await run("file", {
                action: "reveal-file-in-explorer",
                path
            });
        };
        const openDirectoryInExplorer = async (path: string) => {
            path = path.replace(/\//g, "\\");
            await run("file", {
                action: "open-directory-in-explorer",
                path
            });
        };
        const readAppdata = async (path: string) => {
            let response = await run("file", {
                action: "read-appdata",
                path
            });
            return (response as {
                content: string
            }).content;
        };
        const writeAppdata = async (path: string, content: string) => {
            await run("file", {
                action: "write-appdata",
                path,
                content
            });
        };
        return {
            list,
            read,
            write,
            commonFolders,
            directoryExists,
            fileExists,
            createDirectory,
            deleteDirectory,
            getDirectoryName,
            getFileName,
            getFileExtension,
            getFileNameWithoutExtension,
            revealFileInExplorer,
            openDirectoryInExplorer,
            readAppdata,
            writeAppdata
        };
    };
    const file = fileConstructor();

    const gitConstructor = () => {
        const runGit = async (params: any) => {
            return await run("git", params);
        };

        const runGitAsync = async (params: any, onProgress: (progress: IProgress) => void) => {
            return await runAsync("git", params, onProgress);
        };

        const add = async (path: string) => {
            return await runGit({
                action: "add",
                path
            });
        };

        const commit = async (path: string, message: string) => {
            return await runGit({
                action: "commit",
                path,
                message
            });
        };

        const addCommit = async (path: string, message: string) => {
            return await runGit({
                action: "add-commit",
                path,
                message
            });
        };

        const pull = async (path: string) => {
            return await runGit({
                action: "pull",
                path
            });
        };

        const push = async (path: string) => {
            return await runGit({
                action: "push",
                path
            });
        };

        const fetch = async (path: string, options: {
            prune?: boolean
        }) => {
            return await runGit({
                action: "fetch",
                path,
                fetchOptions: options
            });
        };

        const status = async (path: string) => {
            return (await runGit({
                action: "status",
                path
            }) as {
                changes: IGitChange[]
            }).changes;
        };

        const statusAsync = async (path: string, onProgress: (progress: IProgress) => void) => {
            return (await runGitAsync({
                action: "status",
                path
            }, onProgress) as {
                changes: IGitChange[]
            }).changes;
        };

        const log = async (path: string) => {
            return (await runGit({
                action: "log",
                path
            }) as {
                logs: IGitLog[]
            }).logs;
        };

        const checkout = async (path: string, branch: string) => {
            return await runGit({
                action: "checkout",
                path,
                branch
            });
        };

        const createBranch = async (path: string, branch: string) => {
            return await runGit({
                action: "create-branch",
                path,
                branch
            });
        };

        const deleteBranch = async (path: string, branch: string) => {
            return await runGit({
                action: "delete-branch",
                path,
                branch
            });
        };

        const switchBranch = async (path: string, branch: string, switchOptions: {
            createLocalBranch?: boolean,
            trackRemoteBranch?: string,
            detach?: boolean
        }) => {
            return await runGit({
                action: "switch-branch",
                path,
                branch,
                switchOptions
            });
        };

        const currentBranch = async (path: string) => {
            return (await runGit({
                action: "current-branch",
                path
            }) as {
                branch: IGitBranch
            }).branch;
        };

        const currentBranchAsync = async (path: string, onProgress: (progress: IProgress) => void) => {
            return (await runGitAsync({
                action: "current-branch",
                path
            }, onProgress) as {
                branch: IGitBranch
            }).branch;
        };

        const listBranch = async (path: string) => {
            return await runGit({
                action: "list-branch",
                path
            }) as {
                currentBranch: string,
                localBranches: IGitBranch[],
                remoteBranches: IGitBranch[]
            };
        };

        const getBranch = async (path: string, branch: string) => {
            return (await runGit({
                action: "get-branch",
                path,
                branch
            }) as {
                branch: IGitBranch
            }).branch;
        };

        const getGlobalConfig = async (path: string) => {
            return await runGit({
                action: "get-global-config",
                path
            });
        };

        const setGlobalConfig = async (path: string, config: { [key: string]: string }) => {
            return await runGit({
                action: "set-global-config",
                path,
                config
            });
        };

        const getSparseCheckout = async (path: string) => {
            return await runGit({
                action: "get-sparse-checkout",
                path
            });
        };

        const setSparseCheckout = async (path: string, sparse: string[]) => {
            return await runGit({
                action: "set-sparse-checkout",
                path,
                sparse
            });
        };

        const getIgnore = async (path: string) => {
            return await runGit({
                action: "get-ignore",
                path
            });
        };

        const setIgnore = async (path: string, ignore: string[]) => {
            return await runGit({
                action: "set-ignore",
                path,
                ignore
            });
        };

        const cleanFd = async (path: string) => {
            return await runGit({
                action: "clean-fd",
                path
            });
        };

        const resetHard = async (path: string) => {
            return await runGit({
                action: "reset-hard",
                path
            });
        };

        const getRemotes = async (path: string) => {
            return await runGit({
                action: "get-remotes",
                path
            });
        };

        const show = async (path: string, targetFile: string, commitHash: string) => {
            return (await runGit({
                action: "show",
                path,
                targetFile,
                commitHash
            }) as {
                content: string
            }).content;
        };

        const readOrShowHead = async (path: string, targetFile: string) => {
            return (await runGit({
                action: "read-or-show-head",
                path,
                targetFile
            }) as {
                content: string
            }).content;
        };

        const getCommits = async (path: string, branch: string, options: {
            searchKeywords?: string[],
            searchAuthor?: string
        }) => {
            return (await runGit({
                action: "get-commits",
                path,
                branch,
                searchKeywords: options.searchKeywords,
                searchAuthor: options.searchAuthor
            }) as {
                commits: IGitLog[]
            }).commits;
        };
        const reverseDiff = (changes: IGitChange[]) => {
            return changes.map(change => {
                return {
                    ...change,
                    status: change.status == "deleted" ? "untracked" :
                        change.status == "untracked" ? "deleted" : change.status
                } as IGitChange;
            });
        };
        const diff = async (path: string, diffLeftCommit: string, diffRightCommit: string) => {
            let lowercaseDiffLeftCommit = diffLeftCommit.toLowerCase();
            let lowercaseDiffRightCommit = diffRightCommit.toLowerCase();
            if (lowercaseDiffLeftCommit == "head" && lowercaseDiffRightCommit == "workspace") {
                return (await runGit({
                    action: "status",
                    path
                }) as {
                    changes: IGitChange[]
                }).changes;
            }
            else if (lowercaseDiffLeftCommit == "workspace" && lowercaseDiffRightCommit == "head") {
                return reverseDiff((await runGit({
                    action: "status",
                    path
                }) as {
                    changes: IGitChange[]
                }).changes);
            }
            else if (lowercaseDiffLeftCommit == "workspace") {
                return reverseDiff((await runGit({
                    action: "diff",
                    path,
                    diffLeftCommit: "",
                    diffRightCommit
                }) as {
                    changes: IGitChange[]
                }).changes);
            }
            else {
                if (lowercaseDiffRightCommit == "workspace") {
                    diffRightCommit = "";
                }
                if (lowercaseDiffLeftCommit == "head") {
                    diffLeftCommit = "HEAD";
                }
                if (lowercaseDiffRightCommit == "head") {
                    diffRightCommit = "HEAD";
                }
                return (await runGit({
                    action: "diff",
                    path,
                    diffLeftCommit,
                    diffRightCommit
                }) as {
                    changes: IGitChange[]
                }).changes;
            }
        };

        return {
            add,
            commit,
            addCommit,
            pull,
            push,
            fetch,
            status,
            statusAsync,
            log,
            checkout,
            createBranch,
            deleteBranch,
            switchBranch,
            currentBranch,
            currentBranchAsync,
            listBranch,
            getBranch,
            getGlobalConfig,
            setGlobalConfig,
            getSparseCheckout,
            setSparseCheckout,
            getIgnore,
            setIgnore,
            cleanFd,
            resetHard,
            getRemotes,
            show,
            readOrShowHead,
            getCommits,
            diff
        };
    };

    const git = gitConstructor();

    const neuecaxConstructor = () => {
        const listWorkspaces = async () => {
            let response = await run("neuecax", {
                action: "list-workspaces"
            });
            return (response as {
                workspaces: INeuecaxWorkspace[]
            }).workspaces;
        };
        const readFile = async (path: string, filename: string) => {
            let response = await run("neuecax", {
                action: "read-file",
                file: {
                    directory: path,
                    filename: filename
                }
            });
            return (response as {
                content: string
            }).content;
        };
        const writeFile = async (path: string, filename: string, content: string) => {
            await run("neuecax", {
                action: "write-file",
                file: {
                    directory: path,
                    filename: filename
                },
                content: content
            });
        };
        const removeWorkspace = async (workspaceName: string) => {
            await run("neuecax", {
                action: "remove-workspace",
                workspaceName: workspaceName
            });
        };
        const openWorkspace = async (workspaceName: string) => {
            await run("neuecax", {
                action: "open-workspace",
                workspaceName: workspaceName
            });
        };
        const createWorkspace = async (workspaceName: string, workspaceDirectory: string, ipDirectory: string, branchName: string, noSparse?: boolean) => {
            await run("neuecax", {
                action: "create-workspace",
                workspaceName: workspaceName,
                workspaceDirectory: workspaceDirectory,
                ipDirectory: ipDirectory,
                branchName: branchName,
                noSparse: noSparse
            });
        };
        return {
            listWorkspaces,
            readFile,
            writeFile,
            removeWorkspace,
            openWorkspace,
            createWorkspace
        };
    };

    const neuecax = neuecaxConstructor();

    return {
        getUserInfo,
        logout,
        login,
        getLoginInfo,
        getSettings,
        file,
        git,
        neuecax,
        ...base
    }
}

export const localServices = LocalServices();