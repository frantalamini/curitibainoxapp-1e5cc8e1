import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class LazyLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
          <p className="text-muted-foreground">Erro ao carregar a página.</p>
          <Button onClick={this.handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
