import axios from "axios";
import { ICommonFolder, IFolderItem, ILoginInfo, IProgress, IUserInfomation } from "./interfaces";
import { BaseServices } from "./baseServices";
const debug = import.meta.env.VITE_DEBUG === "true";
if (debug) {
    console.log("!!! Debug Mode");
}

const LocalServices = () => {
    const base = BaseServices((window as any).webapplication.baseURL ?? "http://localhost:12332");
    const { api, runAsync } = base;

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
            let response = await runAsync("file", {
                action: "list",
                path
            }, (progress: IProgress) => {
            });
            return (response as {
                items: IFolderItem[]
            }).items;
        };
        const read = async (path: string) => {
            let response = await runAsync("file", {
                action: "read",
                path
            }, (progress: IProgress) => {
            });
            return response as {
                content: string
            }
        };
        const write = async (path: string, content: string) => {
            await runAsync("file", {
                action: "write",
                path,
                content
            }, (progress: IProgress) => {
            });
        };
        const commonFolders = async () => {
            let response = await runAsync("file", {
                action: "common-folders"
            }, (progress: IProgress) => {
            });
            return response as {
                items: ICommonFolder[]
            }
        };
        return {
            list,
            read,
            write,
            commonFolders
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