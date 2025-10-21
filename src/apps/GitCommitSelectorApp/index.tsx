import Icon, { CheckOutlined, SwapOutlined } from "@ant-design/icons";
import { Breakpoint, Button, Input, Space, Spin, Tag, Timeline, Tooltip } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { IGitBranch, IGitCommit, IGitLog } from "../../services/interfaces";
import BranchesSVG from "../../svgs/Branches.svg?react";
import GitCommitSVG from "../../svgs/GitCommit.svg?react";
import { GitBranchSelectorApp } from "../GitBranchSelectorApp";
import { IUseModalOptions, IUseModalSelf, useModal } from "../../services/utils";
import { localServices } from "../../services/localServices";
import { TableApp } from "../TableApp";
import { ColumnsType } from "antd/es/table";
import { useUpdate } from "../../natived";
import { MessageInstance } from "antd/es/message/interface";

export interface GitCommitRecord extends IGitCommit {
    key: string;
}

const isHashCommit = (commit: string | undefined) => {
    if (commit == undefined) {
        return false;
    }
    let lowercaseCommit = commit.toLowerCase();
    if (lowercaseCommit == "workspace" || lowercaseCommit == "head") {
        return false;
    }
    return true;
}

export const GitCommitSelectorApp = forwardRef<{}, {
    projectPath: string;
    defaultBranch?: IGitBranch;
    defaultSelectedCommit?: IGitLog;
    style?: React.CSSProperties;
    messageApi: MessageInstance;
    onSelect: (commit: IGitLog) => void;
}>((props, ref) => {
    const { showModal, modalContainer } = useModal();
    const [currentBranch, updateCurrentBranch, currentBranchRef] = useUpdate<IGitBranch | undefined>(props.defaultBranch);
    const [commits, updateCommits] = useState<GitCommitRecord[]>([]);
    const [selectedCommit, updateSelectedCommit] = useState<IGitLog | undefined>(props.defaultSelectedCommit);
    const [lastSelectedHashCommit, updateLastSelectedHashCommit, lastSelectedHashCommitRef] = useUpdate<IGitLog | undefined>(isHashCommit(props.defaultSelectedCommit?.hash) ? props.defaultSelectedCommit : undefined);
    const [loading, updateLoading, loadingRef] = useUpdate({
        loading: 0,
        perence: undefined as string | undefined,
        message: undefined as string | undefined
    });
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
                    props.messageApi.error(error.message);
                } else {
                    props.messageApi.error("Unknown error");
                }
            }
        } finally {
            if (options.useLoading) {
                updateLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
        }
    };

    const refreshCommitsRef = useRef(async () => {
        await Try({ useLoading: true }, async () => {
            if (currentBranchRef.current == undefined) {
                return;
            }
            let commits = await localServices.git.getCommits(props.projectPath, currentBranchRef.current?.name ?? "", {
            });
            updateCommits(commits.map(commit => ({
                ...commit,
                key: commit.hash
            })));
        });
    });
    const searchCommitsRef = useRef(async (searchValue: string) => {
        await Try({ useLoading: true }, async () => {
            if (currentBranchRef.current == undefined) {
                return;
            }
            let searchKeywords: string[] | undefined = undefined;
            if (searchValue.trim().length > 0) {
                searchKeywords = searchValue.trim().split(" ");
            }
            let commits = await localServices.git.getCommits(props.projectPath, currentBranchRef.current?.name ?? "", {
                searchKeywords: searchKeywords
            });
            updateCommits(commits.map(commit => ({
                ...commit,
                key: commit.hash
            })));
        });
    });
    const onSelectBranch = async () => {
        let selectedBranch: IGitBranch | undefined = currentBranch;
        let accept = await showModal((self) => {
            return <GitBranchSelectorApp style={{
                flex: 1,
                height: 0
            }} projectPath={props.projectPath} onSelect={(branch) => {
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
        if (selectedBranch == undefined) {
            return;
        }
        updateCurrentBranch(selectedBranch);
        await refreshCommitsRef.current();
    };
    useEffect(() => {
        if (currentBranch != undefined) {
            refreshCommitsRef.current();
        }
    }, []);

    const columns: ColumnsType<GitCommitRecord> = [
        {
            title: "Hash",
            key: "hash",
            render: (text: string, record: GitCommitRecord) => <div>{record.hash}</div>
        },
        {
            title: "Author",
            key: "author",
            render: (text: string, record: GitCommitRecord) => <div>{record.author}</div>
        },
        {
            title: "Date",
            key: "date",
            render: (text: string, record: GitCommitRecord) => <div>{record.date}</div>
        },
        {
            title: "Message",
            key: "message",
            render: (text: string, record: GitCommitRecord) => <div>{record.message}</div>
        },
        {
            title: "Action",
            key: "action",
            fixed: "right",
            width: "5em",
            render: (text: string, record: GitCommitRecord) => <div>
                <Button size={"small"} type="text" icon={<CheckOutlined />} onClick={() => onSelectCommit(record)} />
            </div>
        },
        {
            title: "",
            key: "other"
        }
    ];
    const onSelectCommit = (commit: IGitLog) => {
        updateSelectedCommit(commit);
        let lowercaseCommit = commit.hash.toLowerCase();
        if (lowercaseCommit != "workspace" && lowercaseCommit != "head") {
            updateLastSelectedHashCommit(commit);
        }
        props.onSelect(commit);
    };
    const isCommitWorkspace = selectedCommit?.hash.toLowerCase() == "workspace";
    const isCommitHead = selectedCommit?.hash.toLowerCase() == "head";
    const isCommitLastSelectedHash = lastSelectedHashCommit != undefined && lastSelectedHashCommit.hash == selectedCommit?.hash;
    return <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        ...props.style
    }}>
        {modalContainer}
        <div style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: "10px"
        }}>
            <div style={{
                display: "flex",
                flexDirection: "row",
                gap: "10px",
                alignItems: "center"
            }}>
                <BranchesSVG />
                <Button onClick={onSelectBranch}>{currentBranch?.name}</Button>
                <span style={{ width: "10px" }} />
                <GitCommitSVG />
                <div style={{
                    position: "relative",
                }}>
                    <Button color={isCommitWorkspace ? "blue" : "default"}
                        variant={isCommitWorkspace ? "filled" : "text"}
                        onClick={() => {
                            updateSelectedCommit({ hash: "Workspace", message: ["Workspace"], author: "", date: "" });
                        }}>{"Workspace"}</Button>
                    <Icon style={{
                        display: isCommitWorkspace ? "flex" : "none",
                        position: "absolute",
                        right: -5,
                        bottom: -5
                    }} component={CheckOutlined} />
                </div>
                <div style={{
                    position: "relative",
                }}>
                    <Button color={isCommitHead ? "blue" : "default"}
                        variant={isCommitHead ? "filled" : "text"}
                        onClick={() => {
                            updateSelectedCommit({ hash: "HEAD", message: ["HEAD"], author: "", date: "" });
                        }}>{"HEAD"}</Button>
                    <Icon style={{
                        display: isCommitHead ? "flex" : "none",
                        position: "absolute",
                        right: -5,
                        bottom: -5
                    }} component={CheckOutlined} />
                </div>
                <div style={{
                    position: "relative",
                }}>
                    <Tooltip title={lastSelectedHashCommit != undefined ? lastSelectedHashCommit.message.join("\n") : "To Select"}>
                        <Button color={isCommitLastSelectedHash ? "blue" : "default"}
                            variant={isCommitLastSelectedHash ? "filled" : "text"}
                            onClick={() => {
                                if (lastSelectedHashCommit != undefined) {
                                    updateSelectedCommit(lastSelectedHashCommit);
                                }
                            }}>{lastSelectedHashCommit != undefined ? lastSelectedHashCommit.hash : "To Select"}</Button>
                    </Tooltip>
                    <Icon style={{
                        display: isCommitLastSelectedHash ? "flex" : "none",
                        position: "absolute",
                        right: -5,
                        bottom: -5
                    }} component={CheckOutlined} />
                </div>
            </div>
            <div style={{
                display: "flex",
                flexDirection: "row",
                gap: "10px",
                alignItems: "center"
            }}>
                <Input.Search
                    type="text"
                    placeholder="Search commits"
                    onSearch={(value) => {
                        searchCommitsRef.current(value);
                    }}
                />
            </div>
            <TableApp size={"small"} style={{
                flex: 1,
                height: 0
            }} columns={columns} dataSource={commits} />
        </div>
        <div style={{
            position: "absolute",
            display: loading.loading > 0 ? "flex" : "none",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10
        }}>
            <Spin tip={loading.message} percent={loading.loading} />
        </div>
    </div>
});