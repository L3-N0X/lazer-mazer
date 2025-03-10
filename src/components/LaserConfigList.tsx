import React, { useState } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DragIndicator } from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { LaserConfigItem } from "./LaserConfigItem";
import { useLaserConfig } from "../context/LaserConfigContext";
import { LaserConfig } from "../types/LaserConfig";

// Create a sortable wrapper component for LaserConfigItem
interface SortableItemProps {
  laser: LaserConfig;
  onUpdate: (laser: LaserConfig) => void;
  onRemove: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ laser, onUpdate, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: laser.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative" as const,
    zIndex: isDragging ? 1000 : 1,
    opacity: 1,
  };

  // Create a drag handle component
  const DragHandleBox = (
    <Box
      sx={{
        cursor: "grab",
        display: "inline-flex",
        alignItems: "center",
        color: "text.secondary",
        "&:hover": { color: "primary.main" },
        position: "absolute",
        left: 8,
        top: "50%",
        transform: "translateY(-50%)",
      }}
      {...attributes}
      {...listeners}
    >
      <DragIndicator />
    </Box>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <LaserConfigItem
        laser={laser}
        onUpdate={onUpdate}
        onRemove={onRemove}
        isDragging={isDragging}
        dragHandle={DragHandleBox}
      />
    </div>
  );
};

export const LaserConfigList: React.FC = () => {
  const { laserConfig, updateLaser, addLaser, removeLaser, reorderLasers, isLoading } =
    useLaserConfig();
  const [error, setError] = useState<string | null>(null);

  // Set up sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading) {
    return <Typography>Loading laser configurations...</Typography>;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = laserConfig.lasers.findIndex((laser) => laser.id === active.id);
    const newIndex = laserConfig.lasers.findIndex((laser) => laser.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      try {
        const newLasers = arrayMove(laserConfig.lasers, oldIndex, newIndex);
        reorderLasers(newLasers);
        setError(null);
      } catch (err) {
        setError("Failed to reorder lasers. Please try again.");
        console.error(err);
      }
    }
  };

  const handleUpdateLaser = async (updatedLaser: LaserConfig) => {
    try {
      await updateLaser(updatedLaser);
      setError(null);
    } catch (err) {
      setError("Failed to update laser settings. Please try again.");
      console.error(err);
    }
  };

  const handleRemoveLaser = async (id: string) => {
    if (laserConfig.lasers.length <= 1) {
      setError("You must have at least one laser configured.");
      return;
    }

    try {
      await removeLaser(id);
      setError(null);
    } catch (err) {
      setError("Failed to remove laser. Please try again.");
      console.error(err);
    }
  };

  const handleAddLaser = async () => {
    try {
      await addLaser();
      setError(null);
    } catch (err) {
      setError("Failed to add new laser. Please try again.");
      console.error(err);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ my: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddLaser}>
          Add
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each laser is mapped to a specific sensor index from the Arduino. The "Sensor #" label shows
        which sensor value this laser is using. (Serial message order is used, first sensor value is
        sensor #1)
      </Typography>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={laserConfig.lasers.map((laser) => laser.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {laserConfig.lasers
              .sort((a, b) => a.order - b.order)
              .map((laser) => (
                <SortableItem
                  key={laser.id}
                  laser={laser}
                  onUpdate={handleUpdateLaser}
                  onRemove={handleRemoveLaser}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Drag and drop to reorder lasers in the UI. The sensor mapping will remain unchanged.
      </Typography>
    </Box>
  );
};
