import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createModule } from "@/lib/api";

interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModuleCreated?: () => void;
}

export function CreateModuleDialog({ open, onOpenChange, onModuleCreated }: CreateModuleDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a module title",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await createModule({
        title: title.trim(),
        description: description.trim(),
      });

      toast({
        title: "Success",
        description: "Module created successfully",
      });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      onModuleCreated?.();
      navigate(`/module/${data.id}`);
    } catch (error) {
      console.error('Error creating module:', error);
      toast({
        title: "Error",
        description: "Failed to create module. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Module</DialogTitle>
          <DialogDescription>
            Add a new module to your course. You can add materials to it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Module Title
            </label>
            <Input
              id="title"
              placeholder="Enter module title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Enter module description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Module"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 