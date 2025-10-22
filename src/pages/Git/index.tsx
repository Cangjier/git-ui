import { Button, Input, message, Select, Spin, Splitter, Tooltip } from "antd";
import { forwardRef, Key, useEffect, useRef, useState } from "react";
import { ArrowDownOutlined, ArrowRightOutlined, ArrowUpOutlined, CloseOutlined, DeleteOutlined, DiffOutlined, FileAddOutlined, FileTextOutlined, RedoOutlined, SaveOutlined, SwapOutlined, UnorderedListOutlined } from "@ant-design/icons";
import BranchesSVG from "../../svgs/Branches.svg?react";
import { pathUtils, useModal } from "../../services/utils";
import { FileDialog } from "../../apps/FileDialog";
import { localServices } from "../../services/localServices";
import { IGitBranch, IGitChange, IGitLog } from "../../services/interfaces";
import { GitBranchSelectorApp } from "../../apps/GitBranchSelectorApp";
import { InjectClass, useUpdate } from "../../natived";
import { DiffEditor, DiffOnMount, Editor, loader } from "@monaco-editor/react";
import * as monaco from 'monaco-editor'
import DirectoryTree from "antd/es/tree/DirectoryTree";
import { EventDataNode } from "antd/es/tree";
import DotSVG from "../../svgs/Dot.svg?react";
import { GitCommitSelectorApp } from "../../apps/GitCommitSelectorApp";
import GitCommitSVG from "../../svgs/GitCommit.svg?react";
import { TableApp } from "../../apps/TableApp";
import { ColumnsType } from "antd/es/table";
import { pushProject } from "../../apps/ProjectsApp";
import { clientServices } from "../../services/clientServices";

loader.config({ monaco })

const spinClass = InjectClass(`
height: 100%;
`);

export interface GitChangeRecord extends IGitChange {
    key: string,
    title: string,
    isLeaf: boolean,
    children?: GitChangeRecord[]
}

// 转换成目录结构的records
const buildTree = (changes: IGitChange[], parentPath = ""): GitChangeRecord[] => {
    // Group changes by first path segment
    const map: { [segment: string]: IGitChange[] } = {};
    for (const change of changes) {
        // Remove parentPath prefix, get relative path
        let relPath = change.path;
        if (parentPath && relPath.startsWith(parentPath + "/")) {
            relPath = relPath.slice(parentPath.length + 1);
        }
        const segments = relPath.split("/");
        const first = segments[0];
        (map[first] = map[first] || []).push(change);
    }
    const result: GitChangeRecord[] = [];
    for (const segment of Object.keys(map)) {
        const items = map[segment];
        if (
            items.length === 1 &&
            (items[0].path === (parentPath ? `${parentPath}/${segment}` : segment) ||
                !items[0].path.includes("/"))
        ) {
            const ch = items[0];
            result.push({
                ...ch,
                key: ch.path,
                title: segment,
                isLeaf: true
            });
        } else {
            const dirPath = parentPath ? `${parentPath}/${segment}` : segment;
            result.push({
                ...items[0],
                key: dirPath,
                title: segment,
                isLeaf: false,
                children: buildTree(
                    items.map(item => ({
                        ...item,
                        path: item.path
                    })),
                    dirPath
                )
            });
        }
    }
    // Sort folders before files
    return result.sort((a, b) => {
        const aIsDir = !!a.children;
        const bIsDir = !!b.children;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.title.localeCompare(b.title);
    });
};

const convertToGitChangeRecord = (changes: IGitChange[]): GitChangeRecord[] => {
    if (!changes) return [];
    return buildTree(changes);
};

export const Git = forwardRef<HTMLDivElement, {}>((props, ref) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const { showModal, modalContainer } = useModal();
    const [projectPath, updateProjectPath, projectPathRef] = useUpdate("");
    const [currentBranch, updateCurrentBranch, currentBranchRef] = useUpdate<IGitBranch | undefined>(undefined);
    const [commitMessage, updateCommitMessage, commitMessageRef] = useUpdate("");
    const [originalCode, updateOriginalCode] = useState("");
    const [modifiedCode, updateModifiedCode, modifiedCodeRef] = useUpdate("");
    const [changes, updateChanges, changesRef] = useUpdate<GitChangeRecord[] | undefined>(undefined);
    const [diffOldCommit, updateDiffOldCommit, diffOldCommitRef] = useUpdate<IGitLog>({ hash: "HEAD", message: ["HEAD"], author: "", date: "" });
    const [diffNewCommit, updateDiffNewCommit, diffNewCommitRef] = useUpdate<IGitLog>({ hash: "Workspace", message: ["Workspace"], author: "", date: "" });
    const [modifiedChanged, updateModifiedChanged] = useState(false);
    const modifiedRawRef = useRef("");
    const modifiedWordWrapRef = useRef<"on" | "off" | "wordWrapColumn" | "bounded" | undefined>("on");
    const [leftPanelLoading, updateLeftPanelLoading, leftPanelLoadingRef] = useUpdate({
        loading: 0,
        progress: 0,
        message: ""
    });
    const [rightPanelLoading, updateRightPanelLoading, rightPanelLoadingRef] = useUpdate({
        loading: 0,
        progress: 0,
        message: ""
    });
    const [rightPanelView, updateRightPanelView, rightPanelViewRef] = useUpdate<"info" | "diff" | "merge">("info");
    const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null);
    const diffModifiedChangeRef = useRef<GitChangeRecord>(null);
    const Try = async (options: {
        useLeftPanelLoading?: boolean,
        useRightPanelLoading?: boolean
    }, callback: () => Promise<void>) => {
        if (options.useLeftPanelLoading) {
            updateLeftPanelLoading(old => ({
                ...old,
                loading: old.loading + 1
            }));
        }
        if (options.useRightPanelLoading) {
            updateRightPanelLoading(old => ({
                ...old,
                loading: old.loading + 1
            }));
        }
        try {
            await callback();
        }
        catch (error) {
            let isInnerError = false;
            if (options.useLeftPanelLoading && leftPanelLoadingRef.current.loading > 1) {
                isInnerError = true;
            }
            if (options.useRightPanelLoading && rightPanelLoadingRef.current.loading > 1) {
                isInnerError = true;
            }
            if (isInnerError) {
                throw error;
            }
            else {
                if (error instanceof Error) {
                    messageApi.error(error.message);
                } else {
                    messageApi.error(error?.toString() ?? "Unknown error");
                }
            }
        }
        finally {
            if (options.useLeftPanelLoading) {
                updateLeftPanelLoading(old => ({
                    ...old,
                    loading: old.loading - 1
                }));
            }
            if (options.useRightPanelLoading) {
                updateRightPanelLoading(old => ({
                    ...old,
                    loading: old.loading - 1
                }));
            }
        }
    };
    const updateBranchRef = useRef((branch: IGitBranch) => {
        updateCurrentBranch(branch);
        updateChanges(undefined);
        updateDiffOldCommit({ hash: "HEAD", message: ["HEAD"], author: "", date: "" });
        updateDiffNewCommit({ hash: "Workspace", message: ["Workspace"], author: "", date: "" });
        updateRightPanelView("info");
        updateModifiedChanged(false);
        updateOriginalCode("");
        updateModifiedCode("");
        modifiedRawRef.current = "";
    });
    const switchBranchJustSwitchRef = useRef(async (branch: IGitBranch) => {
        await Try({ useLeftPanelLoading: true }, async () => {
            if (branch.type == "local") {
                if (currentBranchRef.current?.name == branch.name) {
                    throw new Error("Already on this branch");
                }
                await localServices.git.switchBranch(projectPathRef.current, branch.name, {

                });
            }
            else {
                let slashIndex = branch.name.indexOf("/");
                let branchName = slashIndex == -1 ? branch.name : branch.name.slice(slashIndex + 1);
                if (currentBranchRef.current?.name == branchName) {
                    throw new Error("Already on this branch");
                }
                await localServices.git.switchBranch(projectPathRef.current, branchName, {
                    createLocalBranch: true
                });
            }
        });
    });
    const initializeCurrentBranchRef = useRef(async (projectPath: string, percentRange?: {
        offset?: number,
        total?: number,
    }) => {
        await Try({ useLeftPanelLoading: true }, async () => {
            if (projectPath == "") {
                return;
            }
            let currentBranch = await localServices.git.currentBranchAsync(projectPath, progress => {
                let percent = (percentRange?.offset ?? 0) + (progress.progress * (percentRange?.total ?? 100));
                updateLeftPanelLoading(old => ({
                    ...old,
                    progress: percent,
                    message: progress.message ?? ""
                }));
            });
            updateProjectPath(projectPath);
            updateBranchRef.current(currentBranch);
        });
    });
    const initializeChangesRef = useRef(async (projectPath: string, percentRange?: {
        offset?: number,
        total?: number,
    }) => {
        await Try({ useLeftPanelLoading: true }, async () => {
            if (projectPath == "") {
                return;
            }
            if (diffOldCommitRef.current == undefined || diffNewCommitRef.current == undefined) {
                messageApi.error("Please select left and right commits");
                return;
            }
            let changes = await localServices.git.diff(projectPath, diffOldCommitRef.current.hash, diffNewCommitRef.current.hash);
            updateChanges(convertToGitChangeRecord(changes));
        });
    });
    const updateBranchByBranchNameRef = useRef(async (branchName: string) => {
        let branch = await localServices.git.getBranch(projectPathRef.current, branchName);
        updateBranchRef.current(branch);
    });
    const onSelectProject = async () => {
        let currentFolder = projectPath;
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
            await Try({ useLeftPanelLoading: true }, async () => {
                await initializeCurrentBranchRef.current(currentFolder);
                await initializeChangesRef.current(projectPathRef.current);
                await pushProject(currentFolder);
            });
        }
    };
    const onSelectBranch = async () => {
        let selectedBranch: IGitBranch | undefined = currentBranch;
        let accept = await showModal((self) => {
            return <GitBranchSelectorApp style={{
                flex: 1,
                height: 0
            }} projectPath={projectPath} onSelect={(branch) => {
                selectedBranch = branch;
            }} selectedBranchName={selectedBranch?.name} />
        }, {
            bodyStyles: {
                height: "60vh",
                display: "flex",
                flexDirection: "column"
            },
            contentStyles: {
                padding: "50px 10px 10px 10px"
            }
        });
        if (accept == false) {
            return;
        }
        await Try({ useLeftPanelLoading: true }, async () => {
            if (selectedBranch == undefined) {
                return;
            }
            await switchBranchJustSwitchRef.current(selectedBranch);
            await initializeCurrentBranchRef.current(projectPathRef.current);
            await initializeChangesRef.current(projectPathRef.current);
        });
    };
    const getCommitCode = async (commit: string, change: GitChangeRecord) => {
        let lowercaseCommit = commit.toLowerCase();
        if (lowercaseCommit == "workspace") {
            return await localServices.neuecax.readFile(projectPathRef.current, change.path);
        }
        else if (lowercaseCommit == "head") {
            return await localServices.git.show(projectPathRef.current, change.path, "HEAD");
        }
        else {
            return await localServices.git.show(projectPathRef.current, change.path, commit);
        }
    };
    const onSelectGitChange = async (selectedKeys: Key[], info: {
        event: "select";
        selected: boolean;
        node: EventDataNode<GitChangeRecord>;
        selectedNodes: GitChangeRecord[];
        nativeEvent: MouseEvent;
    }) => {
        await Try({ useRightPanelLoading: true }, async () => {
            if (info.node.isLeaf == false) return;
            let originalCode = "";
            let modifiedCode = "";
            if (info.node.status == "modified") {
                originalCode = await getCommitCode(diffOldCommitRef.current.hash, info.node);
                modifiedCode = await getCommitCode(diffNewCommitRef.current.hash, info.node);
            }
            else if (info.node.status == "deleted") {
                originalCode = await getCommitCode(diffOldCommitRef.current.hash, info.node);
                modifiedCode = "";
            }
            else if (info.node.status == "untracked") {
                originalCode = "";
                modifiedCode = await getCommitCode(diffNewCommitRef.current.hash, info.node);
            }
            if (modifiedCode.includes("\r")) {
                diffEditorRef.current?.getModifiedEditor()?.getModel()?.setEOL(monaco.editor.EndOfLineSequence.CRLF);
            } else {
                diffEditorRef.current?.getModifiedEditor()?.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);
            }
            modifiedRawRef.current = modifiedCode;
            updateOriginalCode(originalCode);
            updateModifiedCode(modifiedCode);
            diffModifiedChangeRef.current = info.node;
            updateRightPanelView("diff");
            updateModifiedChanged(false);
        });
    };
    const onRefreshChanges = async () => {
        await initializeChangesRef.current(projectPathRef.current);
    };
    const saveModifiedCode = async (onSaved: () => void) => {
        await Try({ useRightPanelLoading: true }, async () => {
            if (diffNewCommitRef.current.hash == "Workspace") {
                await localServices.file.write(`${projectPathRef.current}/${diffModifiedChangeRef.current?.path}`, modifiedCodeRef.current);
                onSaved();
            }
            else if (diffNewCommitRef.current.hash.toLowerCase() == "head") {
                let accept = await showModal((self) => {
                    return <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                    }}>
                        <div>Save modified code to workspace?</div>
                    </div>
                }, {});
                if (accept) {
                    await localServices.file.write(`${projectPathRef.current}/${diffModifiedChangeRef.current?.path}`, modifiedCodeRef.current);
                    onSaved();
                }
            }
            else {
                let accept = await showModal((self) => {
                    return <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                    }}>
                        <div style={{
                            fontWeight: "bold",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "5px"
                        }}>Save modified code from <Tooltip title={
                            [
                                diffNewCommitRef.current.author,
                                diffNewCommitRef.current.date,
                                ...diffNewCommitRef.current.message
                            ].map(message => <div>{message}</div>)}>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: "5px"
                                }}>
                                    <GitCommitSVG />
                                    {diffNewCommitRef.current.hash}
                                </div>
                            </Tooltip> to workspace?</div>
                    </div>
                }, {});
                if (accept) {
                    await localServices.file.write(`${projectPathRef.current}/${diffModifiedChangeRef.current?.path}`, modifiedCodeRef.current);
                    onSaved();
                }
            }

        });
    };
    const onDiffEditorMount: DiffOnMount = (editor, monaco) => {
        diffEditorRef.current = editor;
        editor.updateOptions({
            wordWrap: "on"
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (modifiedCodeRef.current != modifiedRawRef.current) {
                saveModifiedCode(() => {
                    updateModifiedChanged(false);
                    modifiedRawRef.current = modifiedCodeRef.current;
                });
            }
        });
        // Alt+Z to wrap text
        editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
            let wordWrap = modifiedWordWrapRef.current;
            if (wordWrap == "on") {
                wordWrap = "off";
            }
            else {
                wordWrap = "on";
            }
            modifiedWordWrapRef.current = wordWrap;
            editor.updateOptions({
                wordWrap: wordWrap
            });
        });
        const modifiedModel = editor.getModifiedEditor().getModel();
        if (modifiedModel != null) {
            modifiedModel.onDidChangeContent(() => {
                const modifiedValue = modifiedModel.getValue();
                if (modifiedValue != modifiedRawRef.current) {
                    updateModifiedCode(modifiedValue);
                    updateModifiedChanged(true);
                }
                else {
                    updateModifiedChanged(false);
                }
            });
        }
    };
    const onNextDiffSection = (reverse: boolean) => {
        diffEditorRef.current?.goToDiff(reverse ? "previous" : "next");
    };
    const onSelectCompareCommit = async (where: "left" | "right") => {
        let selectedCommit = where == "left" ? diffOldCommitRef.current : diffNewCommitRef.current;
        let accept = await showModal((self) => {
            return <GitCommitSelectorApp
                messageApi={messageApi}
                projectPath={projectPathRef.current}
                defaultBranch={currentBranchRef.current}
                defaultSelectedCommit={selectedCommit}
                onSelect={(commit: IGitLog) => {
                    selectedCommit = commit;
                }} />
        }, {
            bodyStyles: {
                height: "65vh"
            },
            width: "80vw"
        });
        if (accept) {
            console.log("onSelectCompareCommit", selectedCommit);
            if (where == "left") {
                updateDiffOldCommit(selectedCommit);
            }
            else {
                updateDiffNewCommit(selectedCommit);
            }
            await initializeChangesRef.current(projectPathRef.current);
        }
    };
    const onSwapCompareCommit = async () => {
        await Try({ useLeftPanelLoading: true }, async () => {
            let temp = diffOldCommitRef.current;
            updateDiffOldCommit(diffNewCommitRef.current);
            updateDiffNewCommit(temp);
            updateRightPanelView("info");
            updateModifiedChanged(false);
            updateOriginalCode("");
            updateModifiedCode("");
            modifiedRawRef.current = "";
            await initializeChangesRef.current(projectPathRef.current);
        });
    };
    const onCloseDiff = () => {
        updateRightPanelView("info");
        updateModifiedChanged(false);
        updateOriginalCode("");
        updateModifiedCode("");
        modifiedRawRef.current = "";
    };
    const onCommit = async () => {
        if (commitMessageRef.current == "") {
            messageApi.error("Please enter commit message");
            return;
        }
        let changes = await localServices.git.diff(projectPathRef.current, "HEAD", "Workspace");
        if (changes.length == 0) {
            messageApi.error("No changes to commit");
            return;
        }
        let accept = await showModal((self) => {
            const data: GitChangeRecord[] = convertToGitChangeRecord(changes);
            return <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
            }}>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>Are you sure to commit?</div>
                <DirectoryTree
                    titleRender={(node) => {
                        if (node.isLeaf == false) return node.title;
                        if (node.status == "deleted") {
                            return <span style={{
                                alignItems: "center",
                                textDecoration: "line-through"
                            }}>
                                {node.title}
                                <span style={{
                                    marginLeft: "5px"
                                }} />
                                <Tooltip title="Deleted"><DeleteOutlined /></Tooltip>
                            </span>
                        }
                        else if (node.status == "untracked") {
                            return <span style={{
                                alignItems: "center",
                            }}>
                                {node.title}
                                <span style={{
                                    marginLeft: "5px"
                                }} />
                                <Tooltip title="Untracked"><FileAddOutlined /></Tooltip>
                            </span>
                        }
                        else if (node.status == "modified") {
                            return <span style={{
                                alignItems: "center",
                            }}>
                                {node.title}
                                <span style={{
                                    marginLeft: "5px"
                                }} />
                                <Tooltip title="Modified"><DiffOutlined /></Tooltip>
                            </span>
                        }
                    }}
                    style={{
                        flex: 1
                    }}
                    defaultExpandAll
                    treeData={data} />
            </div>
        }, {
            width: "80vw",
            bodyStyles: {
                height: "65vh"
            }
        });
        if (accept == false) {
            return;
        }
        await Try({ useLeftPanelLoading: true, useRightPanelLoading: true }, async () => {
            await localServices.git.add(projectPathRef.current);
            await localServices.git.commit(projectPathRef.current, commitMessageRef.current);
            if (diffOldCommitRef.current.hash.toLowerCase() == "head" && diffNewCommitRef.current.hash.toLowerCase() == "workspace") {
                await initializeChangesRef.current(projectPathRef.current);
            }
        });
    };
    useEffect(() => {
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == "all" && message.data.action == "select-project") {
                let func = async () => {
                    let currentFolder = message.data.project.path;
                    await Try({ useLeftPanelLoading: true }, async () => {
                        await initializeCurrentBranchRef.current(currentFolder);
                        await initializeChangesRef.current(projectPathRef.current);
                        await pushProject(currentFolder);
                    });
                };
                func();
            }
        });
        return () => {
            unregister();
        };
    }, []);
    return <div style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
    }}>
        {messageContextHolder}
        {modalContainer}
        <Splitter style={{
            flex: 1
        }}>
            <Splitter.Panel defaultSize={220} min={220}>
                <div ref={ref} style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#fff",
                    gap: "5px",
                    padding: "10px",
                    height: "calc(100% - 20px)"
                }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        gap: "5px",
                        alignItems: "center"
                    }}>
                        <div style={{
                            cursor: "pointer",
                            fontWeight: "bold"
                        }} onClick={onSelectProject}>{projectPath != "" ? pathUtils.getFileName(projectPath) : "Select Project"}</div>
                        {projectPath != "" && currentBranch != undefined &&
                            <Button size={"small"}
                                type="text"
                                icon={<BranchesSVG />}
                                onClick={onSelectBranch}>{currentBranch.name}</Button>}
                        {projectPath != "" && currentBranch != undefined &&
                            <Button size={"small"}
                                type="text"
                                icon={<RedoOutlined />}
                                onClick={onRefreshChanges} />}
                    </div>
                    {/* Commit Message */}
                    <Input.TextArea
                        style={{
                            display: projectPath == "" || currentBranch == undefined ? 'none' : 'inline-block',
                        }}
                        autoFocus={true}
                        autoSize={{ minRows: 1, maxRows: 9 }}
                        placeholder="Commit message"
                        defaultValue={commitMessage}
                        onBlur={(e) => updateCommitMessage(e.target.value)} />
                    {projectPath != "" && currentBranch != undefined &&
                        <Button type="primary" onClick={onCommit}>Commit</Button>}
                    {/* Changes */}
                    <div style={{
                        display: currentBranch == undefined ? 'none' : 'flex',
                        flexDirection: "column",
                        flex: 1,
                        gap: "5px",
                        overflowY: "auto"
                    }}>
                        <div style={{
                            display: changes == undefined ? 'none' : 'flex',
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "5px",
                            borderRadius: "5px",
                            backgroundColor: "#eee"
                        }}>
                            <Tooltip title={diffOldCommit.message.join("\n")}>
                                <Button style={{ flex: 1 }} size={"small"} type="text" onClick={() => onSelectCompareCommit("left")}>{diffOldCommit.hash}</Button>
                            </Tooltip>
                            <Tooltip title="Swap compare commit"><Button size={"small"} type="text" icon={<SwapOutlined />} onClick={onSwapCompareCommit} /></Tooltip>
                            <Tooltip title={diffNewCommit.message.join("\n")}>
                                <Button style={{ flex: 1 }} size={"small"} type="text" onClick={() => onSelectCompareCommit("right")}>{diffNewCommit.hash}</Button>
                            </Tooltip>
                        </div>
                        <div style={{
                            display: changes == undefined ? 'flex' : 'none',
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            {"No changes"}
                        </div>
                        <DirectoryTree
                            titleRender={(node) => {
                                if (node.isLeaf == false) return node.title;
                                if (node.status == "deleted") {
                                    return <span style={{
                                        alignItems: "center",
                                        textDecoration: "line-through"
                                    }}>
                                        {node.title}
                                        <span style={{
                                            marginLeft: "5px"
                                        }} />
                                        <Tooltip title="Deleted"><DeleteOutlined /></Tooltip>
                                    </span>
                                }
                                else if (node.status == "untracked") {
                                    return <span style={{
                                        alignItems: "center",
                                    }}>
                                        {node.title}
                                        <span style={{
                                            marginLeft: "5px"
                                        }} />
                                        <Tooltip title="Untracked"><FileAddOutlined /></Tooltip>
                                    </span>
                                }
                                else if (node.status == "modified") {
                                    return <span style={{
                                        alignItems: "center",
                                    }}>
                                        {node.title}
                                        <span style={{
                                            marginLeft: "5px"
                                        }} />
                                        <Tooltip title="Modified"><DiffOutlined /></Tooltip>
                                    </span>
                                }
                            }}
                            style={{
                                display: changes == undefined ? 'none' : 'flex',
                                flex: 1
                            }}
                            defaultExpandAll
                            onSelect={onSelectGitChange}
                            treeData={changes} />
                    </div>
                    <div style={{
                        display: leftPanelLoading.loading > 0 ? 'flex' : 'none',
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
                        <Spin tip={leftPanelLoading.message} percent={leftPanelLoading.progress} />
                    </div>
                </div>

            </Splitter.Panel>
            <Splitter.Panel>
                <div style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                }}>
                    <div style={{
                        display: rightPanelView == "info" ? 'flex' : 'none',
                        width: "100%",
                        height: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        color: "#aaa"
                    }}>
                        {projectPath == "" ? "Please select a project"
                            : currentBranch == undefined ? "Please select a branch"
                                : "To see the diff, please select a file"}
                    </div>
                    <div style={{
                        display: rightPanelView == "diff" ? 'flex' : 'none',
                        width: "100%",
                        height: "100%",
                        flexDirection: "column",
                    }}>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "15px",
                            alignItems: "center",
                            padding: "5px 10px",
                            borderRadius: "5px",
                            backgroundColor: "#eee"
                        }}>
                            <div>{diffModifiedChangeRef.current?.title}</div>
                            <Tooltip title={modifiedChanged ? "Save" : "No changes to save"}>
                                <Button style={{
                                    color: modifiedChanged ? "#ff4d4f" : "#aaa",
                                }} size={"small"} type="text" icon={<SaveOutlined />} onClick={() => {
                                    saveModifiedCode(() => {
                                        updateModifiedChanged(false);
                                        modifiedRawRef.current = modifiedCodeRef.current;
                                    });
                                }} />
                            </Tooltip>
                            <Tooltip title="Previous diff"><Button size={"small"} type="text" icon={<ArrowUpOutlined />} onClick={() => onNextDiffSection(true)} /></Tooltip>
                            <Tooltip title="Next diff"><Button size={"small"} type="text" icon={<ArrowDownOutlined />} onClick={() => onNextDiffSection(false)} /></Tooltip>
                            <Tooltip title="Close diff"><Button size={"small"} type="text" icon={<CloseOutlined />} onClick={() => onCloseDiff()} /></Tooltip>
                        </div>
                        <DiffEditor
                            original={originalCode}
                            modified={modifiedCode}
                            onMount={onDiffEditorMount}
                            options={{
                                renderSideBySide: true
                            }} />
                    </div>
                    <div style={{
                        display: rightPanelLoading.loading > 0 ? 'flex' : 'none',
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
                        <Spin tip={rightPanelLoading.message} percent={rightPanelLoading.progress} />
                    </div>
                </div>
            </Splitter.Panel>
        </Splitter>
    </div >
});