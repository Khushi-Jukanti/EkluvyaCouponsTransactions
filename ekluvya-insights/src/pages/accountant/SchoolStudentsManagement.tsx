import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SchoolStudentsManagement = () => {
  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              School & Students Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage school records, student data, and related workflows from
              this section as the module expands.
            </p>
          </div>

          <Card className="glass-card border-dashed">
            <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold">
                School & Students Management
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                This module will be implemented in upcoming tasks.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SchoolStudentsManagement;
