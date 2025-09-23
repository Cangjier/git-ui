import { Button, Input, message, Splitter } from "antd";
import { forwardRef, useState } from "react";
import { RedoOutlined } from "@ant-design/icons";
import BranchesSVG from "../../svgs/Branches.svg?react";

export const Git = forwardRef<HTMLDivElement, {}>((props, ref) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [projectPath, updateProjectPath] = useState("");
    const [projectName, updateProjectName] = useState("");
    const [branchName, updateBranchName] = useState("");
    const [commitMessage, updateCommitMessage] = useState("");
    return <div style={{
        display: "flex",
        flexDirection: "column"
    }}>
        {messageContextHolder}
        <Splitter style={{
            flex: 1
        }}>
            <Splitter.Panel defaultSize={220} min={220}>
                <div ref={ref} style={{
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#fff",
                    gap: "5px"
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
                        }}>{projectName}</div>

                        <div style={{
                            flex: 1
                        }} />
                        <Button size={"small"} type="text" icon={<BranchesSVG />} >{branchName}</Button>
                        <Button size={"small"} type="text" icon={<RedoOutlined />} />
                    </div>
                    {/* Commit Message */}
                    <Input placeholder="Message" value={commitMessage} onChange={(e) => updateCommitMessage(e.target.value)} />
                    {/* Changes */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        overflowY: "auto"
                    }}></div>
                </div>
            </Splitter.Panel>
        </Splitter>
    </div>
});