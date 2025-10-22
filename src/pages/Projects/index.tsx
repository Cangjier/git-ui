import { forwardRef } from "react";
import { ProjectsApp } from "../../apps/ProjectsApp";

export const Projects = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties;
}>((props, ref) => {
    return <div style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        ...props.style
    }}>
        <ProjectsApp style={{
            width: "60vw",
            height: "80vh"
        }} />
    </div>
});