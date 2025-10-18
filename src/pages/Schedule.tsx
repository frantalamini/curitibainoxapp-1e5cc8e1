import MainLayout from "@/components/MainLayout";

const Schedule = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Agenda Técnica</h1>
          <p className="text-muted-foreground">Visualize e gerencie a agenda dos técnicos</p>
        </div>

        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>Página em desenvolvimento</p>
          <p className="text-sm mt-2">Em breve você poderá visualizar a agenda dos técnicos aqui</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Schedule;
