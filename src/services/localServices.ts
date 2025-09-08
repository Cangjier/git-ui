import axios from "axios";
import { ILoginInfo, IProgress, IUserInfomation } from "./interfaces";
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

    return {
        getUserInfo,
        logout,
        login,
        getLoginInfo,
        getSettings,
        ...base
    }
}

export const localServices = LocalServices();