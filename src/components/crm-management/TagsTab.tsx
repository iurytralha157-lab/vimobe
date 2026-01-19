import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Users, Pencil, Trash2, Loader2, Tags as TagsIcon, Search, TrendingUp, Hash } from "lucide-react";
import { useTags, useCreateTag, useDeleteTag } from "@/hooks/use-tags";

const colorOptions = [
  { color: "#ef4444", name: "Vermelho" },
  { color: "#f59e0b", name: "Laranja" },
  { color: "#22c55e", name: "Verde" },
  { color: "#3b82f6", name: "Azul" },
  { color: "#8b5cf6", name: "Roxo" },
  { color: "#ec4899", name: "Rosa" },
  { color: "#06b6d4", name: "Ciano" },
  { color: "#6b7280", name: "Cinza" },
];

export function TagsTab() {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string; description?: string } | null>(
    null
  );
  const [formData, setFormData] = useState({ name: "", color: "#3b82f6", description: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTags = useMemo(() => {
    if (!searchTerm) return tags;
    const lower = searchTerm.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(lower) || tag.description?.toLowerCase().includes(lower));
  }, [tags, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTag) {
      // Update not implemented yet - just close dialog
    } else {
      await createTag.mutateAsync(formData);
    }

    setDialogOpen(false);
    setEditingTag(null);
    setFormData({ name: "", color: "#3b82f6", description: "" });
  };

  const openEdit = (tag: { id: string; name: string; color: string; description?: string | null }) => {
    setEditingTag({ id: tag.id, name: tag.name, color: tag.color, description: tag.description || "" });
    setFormData({ name: tag.name, color: tag.color, description: tag.description || "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTag.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TagsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tags.length}</p>
              <p className="text-xs text-muted-foreground">Tags criadas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Leads tagueados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Tag mais usada</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Média por tag</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTag(null);
              setFormData({ name: "", color: "#3b82f6", description: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTag ? "Editar Tag" : "Nova Tag"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cliente VIP"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === option.color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: option.color }}
                      onClick={() => setFormData({ ...formData, color: option.color })}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da tag..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTag.isPending}>
                {createTag.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingTag ? "Salvar Alterações" : "Criar Tag"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags Grid */}
      {filteredTags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TagsIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-medium mb-2">Nenhuma tag encontrada</h3>
            <p className="text-muted-foreground text-sm">
              {searchTerm ? "Tente outra busca" : "Crie sua primeira tag para organizar seus leads"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTags.map((tag) => (
            <Card key={tag.id} className="p-4 group relative">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tag.color}20` }}>
                  <TagsIcon className="h-5 w-5" style={{ color: tag.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: tag.color, color: "white" }}>{tag.name}</Badge>
                  </div>
                  {tag.description && <p className="text-xs text-muted-foreground mt-1 truncate">{tag.description}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(tag)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tag.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
