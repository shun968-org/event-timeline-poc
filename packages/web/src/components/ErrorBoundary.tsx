import { Component, type ReactNode } from 'react';

interface Props {
  fallback: (error: unknown) => ReactNode;
  children: ReactNode;
}

/** 子の描画・読み込みの失敗を受け止めて、代わりに fallback を出す */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  override state = { error: undefined as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    return this.state.error === undefined
      ? this.props.children
      : this.props.fallback(this.state.error);
  }
}
