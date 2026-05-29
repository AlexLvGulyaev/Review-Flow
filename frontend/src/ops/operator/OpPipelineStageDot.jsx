/** NL-style stage marker (AF `OperationalPipelineStageIcon` composition). */

export function OpPipelineStageDot({ variant = "muted", className = "" }) {
  return (
    <span
      className={`rf-oc-stage-dot rf-oc-stage-dot--${variant}${className ? ` ${className}` : ""}`}
      aria-hidden
    />
  );
}
