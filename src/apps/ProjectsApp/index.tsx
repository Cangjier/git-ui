import { Button, List, message, Spin, Tabs, Tooltip } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { pathUtils, useModal } from "../../services/utils";
import { localServices } from "../../services/localServices";
import { clientServices } from "../../services/clientServices";
import { ArrowsAltOutlined, CopyOutlined, DeleteOutlined, DownOutlined, FolderOpenOutlined, PlusOutlined } from "@ant-design/icons";
import { FileDialog } from "../FileDialog";
import { useUpdate } from "../../natived/lib/Util";
import { INeuecaxWorkspace } from "../../services/interfaces";

export interface IProjectInfo {
    path: string,
    lastUsedTime: number
}

export interface ProjectRecord extends IProjectInfo {
    key: string
}

export interface NeuecaxWorkspaceRecord extends INeuecaxWorkspace {
    key: string;
}

export const pushProject = async (path: string, isBroadcast: boolean = true) => {
    let project: IProjectInfo = {
        path: path,
        lastUsedTime: Date.now()
    };
    let projectsString = await localServices.file.readAppdata("projects.json");
    let projects: IProjectInfo[] = [];
    if (projectsString != "") {
        projects = JSON.parse(projectsString) as IProjectInfo[];
    }
    let existingIndex = projects.findIndex(p => p.path == project.path);
    if (existingIndex > -1) {
        projects.splice(existingIndex, 1);
    }
    projects.unshift(project);
    if (projects.length > 99) {
        projects.pop();
    }
    await localServices.file.writeAppdata("projects.json", JSON.stringify(projects));
    clientServices.broadcast({
        is_broadcast_message: true,
        from: "unknown",
        to: "projects-app",
        data: {
            action: "refresh"
        }
    });
};



export const ProjectsApp = forwardRef<{}, {
    style?: React.CSSProperties;
}>((props, ref) => {
    const { showModal, modalContainer } = useModal();
    const [messageApi, contextHolder] = message.useMessage();
    const [projects, setProjects] = useState<ProjectRecord[]>([]);
    const [neuecaxWorkspaces, setNeuecaxWorkspaces] = useState<NeuecaxWorkspaceRecord[]>([]);
    const [loading, updateLoading, loadingRef] = useUpdate({
        loading: 0,
        message: "",
        progress: undefined
    });
    const [tab, setTab] = useState<"default" | "neuecax">("default");
    const Try = async (options: {
        useLoading?: boolean
    }, callback: () => Promise<void>) => {
        if (options.useLoading) {
            updateLoading(old => ({ ...old, loading: old.loading + 1 }));
        }
        try {
            await callback();
        } catch (error) {
            let isInnerError = false;
            if (options.useLoading && loadingRef.current.loading > 1) {
                isInnerError = true;
            }
            if (isInnerError) {
                throw error;
            }
            else {
                if (error instanceof Error) {
                    messageApi.error(error.message);
                } else {
                    messageApi.error("Unknown error");
                }
            }
        } finally {
            if (options.useLoading) {
                updateLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
        }
    };
    const onSelectProject = (project: ProjectRecord) => {
        clientServices.broadcast({
            is_broadcast_message: true,
            from: "projects-app",
            to: "all",
            data: {
                action: "select-project",
                project: project
            }
        });
        clientServices.broadcast({
            is_broadcast_message: true,
            from: "projects-app",
            to: "home-app",
            data: {
                action: "switch",
                tab: "git"
            }
        });
    };
    const onDeleteProject = async (project: ProjectRecord) => {
        let projectsString = await localServices.file.readAppdata("projects.json");
        let projects: IProjectInfo[] = JSON.parse(projectsString) as IProjectInfo[];
        let index = projects.findIndex(p => p.path == project.path);
        if (index > -1) {
            projects.splice(index, 1);
        }
        await localServices.file.writeAppdata("projects.json", JSON.stringify(projects));
        setProjects(projects.map(p => ({
            key: p.path,
            ...p
        })));
    };
    const initializeProjectsRef = useRef(async () => {
        await Try({ useLoading: true }, async () => {
            let projectsString = await localServices.file.readAppdata("projects.json");
            if (projectsString == "") {
                projectsString = "[]";
            }
            let projects = JSON.parse(projectsString) as IProjectInfo[];
            setProjects(projects.map(p => ({
                key: p.path,
                ...p
            })));
        });
    });
    const initializeNeuecaxWorkspacesRef = useRef(async () => {
        await Try({ useLoading: true }, async () => {
            let workspaces = await localServices.neuecax.listWorkspaces();
            setNeuecaxWorkspaces(workspaces.map(w => ({
                key: w.path,
                ...w
            })));
        });
    });
    const onExploreProject = async (project: ProjectRecord) => {
        await localServices.file.openDirectoryInExplorer(project.path);
    };
    const onCopyProjectPath = async (project: ProjectRecord) => {
        await navigator.clipboard.writeText(project.path);
        messageApi.success("Copied to clipboard");
    };
    const onAddProject = async () => {
        let currentFolder: string | undefined = undefined;
        let accept = await showModal((self) => {
            return <FileDialog
                style={{
                    flex: 1,
                    height: 0
                }}
                defaultCurrentFolder={currentFolder}
                onCurrentFolderChange={(path) => currentFolder = path} />
        }, {
            contentStyles: {
                padding: "10px 0"
            },
            footerStyles: {
                padding: "0px 10px"
            },
            bodyStyles: {
                height: "65vh",
                display: "flex",
                flexDirection: "column"
            },
            width: "80vw"
        })
        if (accept) {
            await Try({ useLoading: true }, async () => {
                if (currentFolder != undefined) {
                    let tempProject: ProjectRecord = {
                        key: currentFolder,
                        path: currentFolder,
                        lastUsedTime: Date.now()
                    };
                    await pushProject(currentFolder);
                    onSelectProject(tempProject);
                }
            });
        }
    };
    useEffect(() => {
        let func = async () => {
            await Try({ useLoading: true }, async () => {
                await initializeProjectsRef.current();
                await initializeNeuecaxWorkspacesRef.current();
            });
        };
        func();
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == "projects-app" && message.data.action == "refresh") {
                initializeProjectsRef.current();
            }
        });
        return () => {
            unregister();
        };
    }, []);
    return <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        ...props.style
    }}>
        {contextHolder}
        {modalContainer}
        <Tabs activeKey={tab} onChange={(key) => setTab(key as "default" | "neuecax")} items={[{
            key: "default",
            label: "Default",
            children: undefined
        }, {
            key: "neuecax",
            label: "Neuecax",
            children: undefined
        }]} />
        <List style={{
            display: tab == "default" ? "block" : "none",
            flex: 1,
            height: 0,
            overflowY: "auto"
        }}
            dataSource={projects}
            footer={
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "10px"
                }}>
                    <Tooltip title="Add project"><Button type="text" icon={<PlusOutlined />} onClick={() => onAddProject()} >Add Project</Button></Tooltip>
                </div>
            }
            renderItem={item => <List.Item style={{
            }}
                actions={[
                    <Tooltip title="Remove project from list"><Button type="text" icon={<DeleteOutlined />} danger onClick={() => onDeleteProject(item)} /></Tooltip>,
                    <Tooltip title="Explore project in file explorer"><Button type="text" icon={<FolderOpenOutlined />} onClick={() => onExploreProject(item)} /></Tooltip>,
                    <Tooltip title="Copy project path to clipboard"><Button type="text" icon={<CopyOutlined />} onClick={() => onCopyProjectPath(item)} /></Tooltip>,
                ]}>
                <List.Item.Meta
                    title={<span style={{ cursor: "pointer" }} onClick={() => onSelectProject(item)}>{pathUtils.getFileName(item.path)}</span>}
                    description={<span style={{ cursor: "pointer" }} onClick={() => onSelectProject(item)}>{item.path}</span>}
                />
            </List.Item>}
        />
        <List style={{
            display: tab == "neuecax" ? "block" : "none",
            flex: 1,
            height: 0,
            overflowY: "auto"
        }}
            dataSource={neuecaxWorkspaces}
            renderItem={item => <List.Item style={{
            }}
            >
                <List.Item.Meta
                    title={<span style={{ cursor: "pointer" }} onClick={() => onSelectProject({
                        key: item.path,
                        path: item.path,
                        lastUsedTime: Date.now()
                    })}>{pathUtils.getFileName(item.path)}</span>}
                    description={<span style={{ cursor: "pointer" }} onClick={() => onSelectProject({
                        key: item.path,
                        path: item.path,
                        lastUsedTime: Date.now()
                    })}>{item.path}</span>}
                />
            </List.Item>}
        />
        <div style={{
            display: loading.loading > 0 ? 'flex' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.1)',
            zIndex: 10
        }}>
            <Spin tip={loading.message} percent={loading.progress} />
        </div>
    </div>
});