import axios from "axios";
import { ICommonFolder, IFolderItem, ILoginInfo, IProgress, IUserInfomation } from "./interfaces";
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
            return response as {
                content: string
            }
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
            await run("file", {
                action: "reveal-file-in-explorer",
                path
            });
        };
        const openDirectoryInExplorer = async (path: string) => {
            await run("file", {
                action: "open-directory-in-explorer",
                path
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
            openDirectoryInExplorer
        };
    };
    const file = fileConstructor();

    return {
        getUserInfo,
        logout,
        login,
        getLoginInfo,
        getSettings,
        file,
        ...base
    }
}

export const localServices = LocalServices();