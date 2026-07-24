import { useMemo } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

const NODE_WIDTH = 220;
const V_GAP = 100;

export default function FlowchartView({ flowchart }) {
  const { nodes, edges } = useMemo(() => {
    const nodes = flowchart.map((item, i) => ({
      id: String(item.id),
      data: { label: `${String(i + 1).padStart(2, "0")} — ${item.label}` },
      position: { x: 40, y: i * V_GAP },
      style: {
        width: NODE_WIDTH,
        background: "#142838",
        color: "#eaf2f8",
        border: "1px solid rgba(148,190,219,0.32)",
        borderRadius: 3,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        padding: "10px 12px",
      },
    }));

    const edges = flowchart
      .filter((item) => item.next !== null && item.next !== undefined)
      .map((item) => ({
        id: `${item.id}-${item.next}`,
        source: String(item.id),
        target: String(item.next),
        animated: true,
        style: { stroke: "#c9814c" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#c9814c" },
      }));

    return { nodes, edges };
  }, [flowchart]);

  return (
    <div className="blueprint-frame flowchart-panel">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background color="rgba(148,190,219,0.2)" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
