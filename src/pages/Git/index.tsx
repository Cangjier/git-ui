import { Button, Input } from "antd";
import { forwardRef, useState } from "react";
import { RedoOutlined } from "@ant-design/icons";

export const Git = forwardRef<HTMLDivElement, {}>((props, ref) => {
    const [projectPath, updateProjectPath] = useState("");
    const [projectName, updateProjectName] = useState("");
    const [branchName, updateBranchName] = useState("");
    const [message, updateMessage] = useState("");
    return <div ref={ref} style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        gap: "5px"
    }}>
        <div style={{
            display: "flex",
            flexDirection: "row",
            gap: "5px"
        }}>
            <div>{projectName}</div>
            <div>{branchName}</div>
            <div style={{
                flex: 1
            }}>

            </div>
            <Button type="text" icon={<RedoOutlined />} />
        </div>
        {/* Commit Message */}
        <Input placeholder="Message" value={message} onChange={(e) => updateMessage(e.target.value)} />
        {/* Changes */}
        <div style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflowY: "auto"
        }}></div>
    </div>
});