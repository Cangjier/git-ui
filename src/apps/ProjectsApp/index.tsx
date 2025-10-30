import { Button, Dropdown, Input, List, message, Space, Spin, Switch, Tabs, Tooltip } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { pathUtils, useModal } from "../../services/utils";
import { localServices } from "../../services/localServices";
import { clientServices } from "../../services/clientServices";
import { ArrowsAltOutlined, CopyOutlined, DeleteOutlined, DownOutlined, FolderOpenOutlined, MenuOutlined, PlusOutlined } from "@ant-design/icons";
import { FileDialog } from "../FileDialog";
import { useUpdate } from "../../natived/lib/Util";
import { IGitBranch, INeuecaxWorkspace } from "../../services/interfaces";
import TerminalSvg from "../../svgs/Terminal.svg?react";
import CommitSvg from "../../svgs/Commit.svg?react";
import BranchSvg from "../../svgs/Branches.svg?react";
import { broadcastSwitchToHome, homeAppActions, homeAppName } from "../../pages/Home";
import { GitBranchSelectorApp } from "../GitBranchSelectorApp";

export interface IHistoryInfo {
    path: string,
    lastUsedTime: number
}

export interface HistoryRecord extends IHistoryInfo {
    key: string
}

export interface NeuecaxWorkspaceRecord extends INeuecaxWorkspace {
    key: string;
}
export const historyFileName = "history.json";
export const historyAppName = "history-app";
export const historyAppActions = {
    refresh: "refresh",
    selectHistory: "select-history",
}
export const broadcastSelectHistoryFromHistoryToAll = (history: HistoryRecord) => {
    clientServices.broadcast({
        is_broadcast_message: true,
        from: historyAppName,
        to: "all",
        data: {
            action: historyAppActions.selectHistory,
            history: history
        }
    });
};
export const broadcastRefreshHistoryToHistory = () => {
    clientServices.broadcast({
        is_broadcast_message: true,
        from: "unknown",
        to: historyAppName,
        data: {
            action: "refresh"
        }
    });
};
export const pushHistory = async (path: string, isBroadcast: boolean = true) => {
    let project: IHistoryInfo = {
        path: path.replace(/\\/g, "/"),
        lastUsedTime: Date.now()
    };
    let projectsString = await localServices.file.readAppdata(historyFileName);
    let projects: IHistoryInfo[] = [];
    if (projectsString != "") {
        projects = JSON.parse(projectsString) as IHistoryInfo[];
    }
    let existingIndex = projects.findIndex(p => p.path == project.path);
    if (existingIndex > -1) {
        projects.splice(existingIndex, 1);
    }
    projects.unshift(project);
    if (projects.length > 99) {
        projects.pop();
    }
    await localServices.file.writeAppdata(historyFileName, JSON.stringify(projects));
    broadcastRefreshHistoryToHistory();
};



export const ProjectsApp = forwardRef<{}, {
    style?: React.CSSProperties;
}>((props, ref) => {
    const { showModal, modalContainer } = useModal();
    const [messageApi, contextHolder] = message.useMessage();
    const [histories, setHistories] = useState<HistoryRecord[]>([]);
    const [historyRepeatedNames, setHistoryRepeatedNames] = useState<string[]>([]);
    const [neuecaxWorkspaces, setNeuecaxWorkspaces] = useState<NeuecaxWorkspaceRecord[]>([]);
    const [historyLoading, updateHistoryLoading, historyLoadingRef] = useUpdate({
        loading: 0,
        message: "",
        progress: undefined
    });
    const [neuecaxLoading, updateNeuecaxLoading, neuecaxLoadingRef] = useUpdate({
        loading: 0,
        message: "",
        progress: undefined
    });
    type TabEnum = "history" | "neuecax-workspace";
    const [tab, setTab] = useState<TabEnum>("history");
    useEffect(() => {
        setHistoryRepeatedNames(histories.map(p => pathUtils.getFileName(p.path)).filter((name, index, self) => self.indexOf(name) !== index));
    }, [histories]);
    const Try = async (options: {
        useHistoryLoading?: boolean
        useNeuecaxLoading?: boolean
    }, callback: () => Promise<void>) => {
        if (options.useHistoryLoading) {
            updateHistoryLoading(old => ({ ...old, loading: old.loading + 1 }));
        }
        if (options.useNeuecaxLoading) {
            updateNeuecaxLoading(old => ({ ...old, loading: old.loading + 1 }));
        }
        try {
            await callback();
        } catch (error) {
            let isInnerError = false;
            if (options.useHistoryLoading && historyLoadingRef.current.loading > 1) {
                isInnerError = true;
            }
            if (options.useNeuecaxLoading && neuecaxLoadingRef.current.loading > 1) {
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
            if (options.useHistoryLoading) {
                updateHistoryLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
            if (options.useNeuecaxLoading) {
                updateNeuecaxLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
        }
    };
    const onSelectHistory = (history: HistoryRecord) => {
        broadcastSelectHistoryFromHistoryToAll(history);
        broadcastSwitchToHome("git", historyAppName);
    };
    const onDeleteHistory = async (project: HistoryRecord) => {
        let projectsString = await localServices.file.readAppdata(historyFileName);
        let projects: IHistoryInfo[] = JSON.parse(projectsString) as IHistoryInfo[];
        let index = projects.findIndex(p => p.path == project.path);
        if (index > -1) {
            projects.splice(index, 1);
        }
        await localServices.file.writeAppdata(historyFileName, JSON.stringify(projects));
        setHistories(projects.map(p => ({
            key: p.path,
            ...p
        })));
    };
    const initializeHistoryRef = useRef(async () => {
        await Try({ useHistoryLoading: true }, async () => {
            let projectsString = await localServices.file.readAppdata(historyFileName);
            if (projectsString == "") {
                projectsString = "[]";
            }
            let projects = JSON.parse(projectsString) as IHistoryInfo[];
            setHistories(projects.map(p => ({
                key: p.path,
                ...p
            })));
        });
    });
    const initializeNeuecaxWorkspacesRef = useRef(async () => {
        await Try({ useNeuecaxLoading: true }, async () => {
            let workspaces = await localServices.neuecax.listWorkspaces();
            setNeuecaxWorkspaces(workspaces.map(w => ({
                key: w.path,
                ...w
            })));
        });
    });
    const onExploreHistory = async (history: HistoryRecord) => {
        await localServices.file.openDirectoryInExplorer(history.path);
    };
    const onCopyHistoryPath = async (history: HistoryRecord) => {
        await navigator.clipboard.writeText(history.path);
        messageApi.success("Copied to clipboard");
    };
    const onAddHistory = async () => {
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
            await Try({ useHistoryLoading: true }, async () => {
                if (currentFolder != undefined) {
                    let tempProject: HistoryRecord = {
                        key: currentFolder,
                        path: currentFolder,
                        lastUsedTime: Date.now()
                    };
                    await pushHistory(currentFolder);
                    onSelectHistory(tempProject);
                }
            });
        }
    };
    const getHistoryAlias = (history: HistoryRecord) => {
        let name = pathUtils.getFileName(history.path);
        let repeatedIndex = historyRepeatedNames.findIndex(n => n == name);
        if (repeatedIndex == -1) {
            return name;
        }
        return `${pathUtils.getFileName(pathUtils.getDirectoryName(history.path))}/${name}`;
    };
    const onRemoveWorkspace = async (workspace: NeuecaxWorkspaceRecord) => {
        await localServices.neuecax.removeWorkspace(workspace.path);
        setNeuecaxWorkspaces(neuecaxWorkspaces.filter(w => w.path != workspace.path));
    };
    const onOpenWorkspace = async (workspace: NeuecaxWorkspaceRecord) => {
        await localServices.neuecax.openWorkspace(workspace.path);
    };
    const getSameParentDirectory = (paths: string[]) => {
        interface IDirectoryNode {
            name: string;
            path: string;
            children: IDirectoryNode[];
        }
        let root: IDirectoryNode = {
            name: "",
            path: "",
            children: []
        };
        let addDirectory = (path: string) => {
            let parts = path.replace(/\\/g, "/").split("/");
            let node = root;
            for (let i = 0; i < parts.length; i++) {
                let path = parts.slice(0, i + 1).join("/");
                let part = parts[i];
                let child = node.children.find(c => c.name == part);
                if (child == undefined) {
                    child = { name: part, path: path, children: [] };
                    node.children.push(child);
                }
                node = child;
            }
        };
        for (let path of paths) {
            addDirectory(path);
        }
        let currentNode = root;
        while (currentNode.children.length == 1) {
            currentNode = currentNode.children[0];
        }
        return currentNode.path;
    };
    const onCreateWorkspace = async () => {
        let workspaceParentDirectories = neuecaxWorkspaces.map(w => pathUtils.getDirectoryName(w.path)).reduce((acc, curr) => {
            if (curr != undefined && curr != "" && !acc.includes(curr)) {
                acc.push(curr);
            }
            return acc;
        }, [] as string[]);
        let ipDirectories = neuecaxWorkspaces.map(w => w.ref).reduce((acc, curr) => {
            if (curr != undefined && curr != "" && !acc.includes(curr)) {
                acc.push(curr);
            }
            return acc;
        }, [] as string[]);

        await Try({ useNeuecaxLoading: true }, async () => {
            let options: {
                workspaceName: string,
                workspaceDirectory: string,
                ipDirectory: string,
                branchName: string,
                noSparse?: boolean
            } = {
                workspaceName: "",
                workspaceDirectory: workspaceParentDirectories[0] ?? "",
                ipDirectory: ipDirectories[0] ?? "",
                branchName: "",
                noSparse: undefined
            };
            let updateInnerLoading: ((loading: number) => void) | undefined = undefined as any;
            const onOKPredicate = async () => {
                if (options.workspaceName == "" || options.workspaceName == undefined) {
                    messageApi.error("Please enter a workspace name");
                    return false;
                }
                if (options.workspaceDirectory == "" || options.workspaceDirectory == undefined) {
                    messageApi.error("Please select a workspace directory");
                    return false;
                }
                if (options.ipDirectory == "" || options.ipDirectory == undefined) {
                    messageApi.error("Please select an IP directory");
                    return false;
                }
                if (options.branchName == "" || options.branchName == undefined) {
                    messageApi.error("Please select a branch");
                    return false;
                }
                updateInnerLoading?.(1);
                try {
                    await localServices.neuecax.createWorkspace(options.workspaceName, options.workspaceDirectory, options.ipDirectory, options.branchName, options.noSparse);
                    await initializeNeuecaxWorkspacesRef.current();
                } catch (error) {
                    messageApi.error(`Failed to create workspace: ${error instanceof Error ? error.message : "Unknown error"}`);
                    return false;
                } finally {
                    updateInnerLoading?.(-1);
                }
                return true;
            };
            await showModal((self) => {
                const { showModal, modalContainer } = useModal();
                const [workspaceName, updateWorkspaceName, workspaceNameRef] = useUpdate(options.workspaceName);
                const [workspaceDirectory, updateWorkspaceDirectory, workspaceDirectoryRef] = useUpdate(options.workspaceDirectory);
                const [ipDirectory, updateIpDirectory, ipDirectoryRef] = useUpdate(options.ipDirectory);
                const [branch, updateBranch, branchRef] = useUpdate<IGitBranch | undefined>(options.branchName == "" ? undefined : {
                    type: "local",
                    name: options.branchName
                } as IGitBranch);
                const [noSparse, updateNoSparse, noSparseRef] = useUpdate(options.noSparse);
                const [toSelectIPDirectories, updateToSelectIPDirectories, toSelectIPDirectoriesRef] = useUpdate(ipDirectories);
                const [toSelectWorkspaceDirectories, updateToSelectWorkspaceDirectories, toSelectWorkspaceDirectoriesRef] = useUpdate(workspaceParentDirectories);
                const [loading, updateLoading, loadingRef] = useUpdate<{
                    loading: number,
                    message: string,
                    progress: number | undefined
                }>({
                    loading: 0,
                    message: "",
                    progress: undefined
                });
                updateInnerLoading = (loading: number) => {
                    updateLoading(old => ({ ...old, loading: old.loading + loading }));
                };
                useEffect(() => {
                    options.workspaceName = workspaceName;
                    options.workspaceDirectory = workspaceDirectory;
                    options.ipDirectory = ipDirectory;
                    if (branch != undefined) {
                        if (branch.type == "local") {
                            options.branchName = branch.name;
                        }
                        else {
                            // remove origin/
                            let slashIndex = branch.name.indexOf("/");
                            options.branchName = branch.name.slice(slashIndex + 1);
                        }
                    }
                    options.noSparse = noSparse;
                }, [workspaceName, workspaceDirectory, ipDirectory, branch, noSparse]);

                const onSelectWorkspaceDirectory = async () => {
                    let currentFolder: string | undefined = workspaceDirectory;
                    let accept = await showModal((self) => {
                        const [tempDirectory, updateTempDirectory, tempDirectoryRef] = useUpdate<string | undefined>(currentFolder);
                        useEffect(() => {
                            currentFolder = tempDirectory;
                        }, [tempDirectory]);
                        return <FileDialog
                            style={{
                                flex: 1,
                                height: 0
                            }}
                            defaultCurrentFolder={tempDirectory}
                            onCurrentFolderChange={(path) => updateTempDirectory(path)} />
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
                    });
                    if (currentFolder == undefined) {
                        return;
                    }
                    if (accept) {
                        updateWorkspaceDirectory(currentFolder);
                    }
                };
                const onSelectIPDirectory = async () => {
                    let currentFolder: string | undefined = ipDirectory;
                    let accept = await showModal((self) => {
                        const [tempDirectory, updateTempDirectory, tempDirectoryRef] = useUpdate<string | undefined>(currentFolder);
                        useEffect(() => {
                            currentFolder = tempDirectory;
                        }, [tempDirectory]);
                        return <FileDialog
                            style={{
                                flex: 1,
                                height: 0
                            }}
                            defaultCurrentFolder={tempDirectory}
                            onCurrentFolderChange={(path) => updateTempDirectory(path)} />
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
                    });
                    if (currentFolder == undefined) {
                        return;
                    }
                    if (accept) {
                        updateIpDirectory(currentFolder);
                    }
                };
                const onSelectBranch = async () => {
                    let selectedBranch: IGitBranch | undefined = branchRef.current;
                    if (ipDirectoryRef.current == "" || ipDirectoryRef.current == undefined) {
                        messageApi.error("Please select an IP directory");
                        return;
                    }
                    let accept = await showModal((self) => {
                        return <GitBranchSelectorApp style={{
                            flex: 1,
                            height: 0
                        }} projectPath={`${ipDirectoryRef.current}/neuecax`.replace(/\\/g, "/")} onSelect={(branch) => {
                            selectedBranch = branch;
                        }} selectedBranchName={selectedBranch?.name} />
                    }, {
                        bodyStyles: {
                            height: "60vh",
                            display: "flex",
                            flexDirection: "column"
                        },
                        contentStyles: {
                            padding: "50px 10px 50px 10px"
                        },
                        width: "80vw",
                    });
                    if (accept == false) {
                        return;
                    }
                    if (selectedBranch == undefined) {
                        return;
                    }
                    updateBranch(selectedBranch);
                };
                const keyWidth = "12em";
                return <div style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    height: 0
                }}>
                    {modalContainer}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        height: 0,
                        gap: "10px"
                    }}>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center"
                        }}>
                            <div style={{ minWidth: keyWidth }}>Workspace name:</div>
                            <Input placeholder="Workspace name" value={workspaceName} onChange={(e) => updateWorkspaceName(e.target.value)} />
                        </div>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center"
                        }}>
                            <div style={{ minWidth: keyWidth }}>Workspace directory:</div>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input placeholder="Workspace directory" value={workspaceDirectory} onChange={(e) => updateWorkspaceDirectory(e.target.value)} />
                                <Button icon={<FolderOpenOutlined />} onClick={() => onSelectWorkspaceDirectory()} />
                                <Dropdown placement="bottomRight" trigger={["hover"]} menu={{
                                    items: toSelectWorkspaceDirectories.map(d => ({
                                        key: d,
                                        label: d,
                                        onClick: () => updateWorkspaceDirectory(d)
                                    })),
                                }}>
                                    <Button icon={<MenuOutlined />} />
                                </Dropdown>
                            </Space.Compact>
                        </div>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center"
                        }}>
                            <div style={{ minWidth: keyWidth }}>IP directory:</div>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input placeholder="IP directory" value={ipDirectory} onChange={(e) => updateIpDirectory(e.target.value)} />
                                <Button icon={<FolderOpenOutlined />} onClick={() => onSelectIPDirectory()} />
                                <Dropdown placement="bottomRight" trigger={["hover"]} menu={{
                                    items: toSelectIPDirectories.map(d => ({
                                        key: d,
                                        label: d,
                                        onClick: () => updateIpDirectory(d)
                                    })),
                                }}>
                                    <Button icon={<MenuOutlined />} />
                                </Dropdown>
                            </Space.Compact>
                        </div>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "20px",
                            padding: "10px"
                        }}>
                            <Button icon={<BranchSvg />} onClick={() => onSelectBranch()} >{branch == undefined ? "Select Branch" : branch.name}</Button>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: "10px"
                            }}>
                                <div>Build IP</div>
                                <Switch checked={noSparse} onChange={(checked) => updateNoSparse(checked)} />
                            </div>

                        </div>
                    </div>
                    <div style={{
                        display: loading.loading > 0 ? 'flex' : 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.02)',
                        zIndex: 10
                    }}>
                        <Spin tip={loading.message} percent={loading.progress} />
                    </div>
                </div>
            }, {
                width: "80vw",
                height: "calc(65vh - 30px)",
                bodyStyles: {
                    display: "flex",
                    flexDirection: "column",
                    marginTop: "30px"
                },
                onOkPredicate: onOKPredicate
            });

        });
    };
    useEffect(() => {
        let func = async () => {
            await Try({}, async () => {
                await initializeHistoryRef.current();
                await initializeNeuecaxWorkspacesRef.current();
            });
        };
        func();
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == historyAppName && message.data.action == "refresh") {
                initializeHistoryRef.current();
            }
        });
        return () => {
            unregister();
        };
    }, []);
    return <div style={{
        display: "flex",
        flexDirection: "column",
        ...props.style
    }}>
        {contextHolder}
        {modalContainer}
        <Tabs activeKey={tab} onChange={(key) => setTab(key as TabEnum)} items={[{
            key: "history",
            label: "History",
            children: undefined
        }, {
            key: "neuecax-workspace",
            label: "Neuecax-Workspace",
            children: undefined
        }]} tabBarExtraContent={{
            right: tab == "history" ? <Tooltip title="Add folder"><Button type="text" icon={<PlusOutlined />} onClick={() => onAddHistory()} >Add Folder</Button></Tooltip> :
                tab == "neuecax-workspace" ? <Tooltip title="Add workspace"><Button type="text" icon={<PlusOutlined />} onClick={() => onCreateWorkspace()} >Add Workspace</Button></Tooltip> : undefined
        }} />
        <div style={{
            position: "relative",
            display: tab == "history" ? "flex" : "none",
            flex: 1,
            flexDirection: "column",
            height: 0
        }}>
            <List style={{
                display: "block",
                flex: 1,
                height: 0,
                overflowY: "auto"
            }}
                dataSource={histories}
                renderItem={item => <List.Item style={{
                }}
                    actions={[
                        <Tooltip title="Remove item from history"><Button type="text" icon={<DeleteOutlined />} danger onClick={() => onDeleteHistory(item)} /></Tooltip>,
                        <Tooltip title="Explore item in file explorer"><Button type="text" icon={<FolderOpenOutlined />} onClick={() => onExploreHistory(item)} /></Tooltip>,
                        <Tooltip title="Copy item path to clipboard"><Button type="text" icon={<CopyOutlined />} onClick={() => onCopyHistoryPath(item)} /></Tooltip>,
                    ]}>
                    <List.Item.Meta
                        title={<span style={{ cursor: "pointer" }} onClick={() => onSelectHistory(item)}>{getHistoryAlias(item)}</span>}
                        description={<span style={{ cursor: "pointer" }} onClick={() => onSelectHistory(item)}>{item.path.replace(/\\/g, "/")}</span>}
                    />
                </List.Item>}
            />
            <div style={{
                display: historyLoading.loading > 0 ? 'flex' : 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.02)',
                zIndex: 10
            }}>
                <Spin tip={historyLoading.message} percent={historyLoading.progress} />
            </div>
        </div>
        <div style={{
            position: "relative",
            display: tab == "neuecax-workspace" ? "flex" : "none",
            flex: 1,
            flexDirection: "column",
            height: 0
        }}>
            <List style={{
                display: "block",
                flex: 1,
                height: 0,
                overflowY: "auto"
            }}
                dataSource={neuecaxWorkspaces}
                renderItem={item => <List.Item style={{
                }}
                    actions={[
                        <Tooltip title="Explore workspace in file explorer"><Button type="text" icon={<FolderOpenOutlined />} onClick={() => onExploreHistory({
                            key: item.path,
                            path: item.path,
                            lastUsedTime: Date.now()
                        })} /></Tooltip>,
                        <Tooltip title="Copy workspace path to clipboard"><Button type="text" icon={<CopyOutlined />} onClick={() => onCopyHistoryPath({
                            key: item.path,
                            path: item.path,
                            lastUsedTime: Date.now()
                        })} /></Tooltip>,
                        <Tooltip title="Remove workspace"><Button type="text" icon={<DeleteOutlined />} danger onClick={() => onRemoveWorkspace(item)} /></Tooltip>,
                        <Tooltip title="Open workspace"><Button type="text" icon={<TerminalSvg />} onClick={() => onOpenWorkspace(item)} /></Tooltip>,
                    ]}
                >
                    <List.Item.Meta
                        title={<span style={{ cursor: "pointer" }} onClick={() => onSelectHistory({
                            key: `${item.path}/neuecax`,
                            path: `${item.path}/neuecax`,
                            lastUsedTime: Date.now()
                        })}>{pathUtils.getFileName(item.path)}</span>}
                        description={<span style={{ cursor: "pointer" }} onClick={() => onSelectHistory({
                            key: `${item.path}/neuecax`,
                            path: `${item.path}/neuecax`,
                            lastUsedTime: Date.now()
                        })}>{item.path}</span>}
                    />
                </List.Item>}
            />
            <div style={{
                display: neuecaxLoading.loading > 0 ? 'flex' : 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.02)',
                zIndex: 10
            }}>
                <Spin tip={neuecaxLoading.message} percent={neuecaxLoading.progress} />
            </div>
        </div>


    </div>
});