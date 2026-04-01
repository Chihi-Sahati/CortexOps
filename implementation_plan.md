# UI/UX Improvement Plan - Phases 2-4

This plan outlines the remaining steps to transform the CortexOps interface into a premium, professional-grade AI workbench.

## Proposed Changes

### 1. Editor Toolbar Overhaul
#### [MODIFY] [EditorToolbar.tsx](file:///c:/Users/husse\hus/Desktop/Chihi/Cortex/Cortex/src/components/editor/EditorToolbar.tsx)
- Integrate "Run" button with loading/disabled states.
- Add "Fit View" button using `fitView` from `@xyflow/react`.
- Group "Add Node", "Undo", "Redo" for better layout.
- Use `variables.css` for consistent spacing and backgrounds.

### 2. Workflow Logic & Feedback
#### [MODIFY] [WorkflowCanvas.tsx](file:///c:/Users/husse\hus/Desktop/Chihi/Cortex/Cortex/src/components/editor/WorkflowCanvas.tsx)
- Implement state-based overlays (Running... Saving...).
- Hook up "Fit View" functionality.
- Style edges dynamically based on status if possible.

### 3. Polish & Components
#### [MODIFY] [CustomNode.tsx](file:///c:/Users/husse\hus/Desktop/Chihi/Cortex/Cortex/src/components/editor/CustomNode.tsx)
- Use global CSS variables for colors (triggers = blue, logic = orange, etc.).
- Standardize sizing (ensure labels don't overflow).

#### [NEW] [EmptyState.tsx](file:///c:/Users/husse\hus/Desktop/Chihi/Cortex/Cortex/src/components/shared/EmptyState.tsx)
- Unified empty state with illustrative icons for "No Workflows" and "Blank Dashboard".

### 4. Natural Language Input Polish
#### [MODIFY] [NLInput.tsx](file:///c:/Users/husse\hus/Desktop/Chihi/Cortex/Cortex/src/components/chat/NLInput.tsx)
- Better placeholder examples (e.g., "Summarize unread emails and send to Slack").
- Add success/error feedback directly above the input.
- Clear generating/loading indicators.

## Verification Plan
1. **Linting**: Ensure `bun run lint` passes with no new warnings.
2. **UI Audit**: Verify that colors and fonts match the new design system.
3. **Execution Flow**: Test "Run -> Saving -> Success Toast" carefully.
