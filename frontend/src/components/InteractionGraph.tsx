import { useCallback, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  NodeProps,
} from "reactflow";
import { motion } from "framer-motion";

interface InteractionGraphProps {
  nodes: Array<{ id: string }>;
  edges: Array<{
    source: string;
    target: string;
    severity: string;
    weight: number;
    color?: string;
  }>;
  severityColors: Record<string, string>;
}

function CustomNode({ data, selected }: NodeProps<{ label: string; severity?: string; color?: string }>) {
  const color = data.color ?? "#9B8FA6";
  return (
    <motion.div
      className="px-3 py-2 rounded-xl text-sm font-medium shadow-soft border border-white/80"
      style={{
        backgroundColor: `${color}22`,
        color: color,
        borderColor: `${color}44`,
      }}
      animate={{
        boxShadow: selected
          ? `0 0 0 2px ${color}, 0 4px 24px -4px rgba(0,0,0,0.1)`
          : "0 4px 24px -4px rgba(0,0,0,0.08)",
      }}
      transition={{ duration: 0.3 }}
    >
      {data.label}
    </motion.div>
  );
}

export default function InteractionGraph({
  nodes: rawNodes,
  edges: rawEdges,
  severityColors,
}: InteractionGraphProps) {
  const nodeTypes = useCallback(
    () => ({ custom: CustomNode }),
    []
  )();

  const nodes: Node[] = rawNodes.map((n) => ({
    id: n.id,
    type: "custom",
    position: { x: 0, y: 0 },
    data: { label: n.id },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges: Edge[] = rawEdges.map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: e.severity === "Moderate",
    style: {
      stroke: e.color ?? severityColors[e.severity] ?? severityColors.Unknown,
      strokeWidth: e.severity === "Severe" ? 2.5 : 1.5,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.color ?? severityColors[e.severity] },
  }));

  const [nodeList, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgeList, , onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    const nodeIds = rawNodes.map((n) => n.id);
    const spacing = 140;
    const cols = Math.ceil(Math.sqrt(nodeIds.length)) || 1;
    const positions: Record<string, { x: number; y: number }> = {};
    nodeIds.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[id] = { x: col * spacing + 40, y: row * spacing + 40 };
    });
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        position: positions[n.id] ?? n.position,
        data: {
          ...n.data,
          color: rawEdges.find((e) => e.source === n.id || e.target === n.id)?.color ?? severityColors.Unknown,
        },
      }))
    );
  }, [rawNodes, rawEdges, setNodes, severityColors]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodeList}
        edges={edgeList}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="rounded-b-3xl"
      >
        <Background color="#d4e8e2" gap={16} size={0.5} />
        <Controls showInteractive={false} className="!shadow-soft !rounded-xl" />
      </ReactFlow>
    </div>
  );
}
