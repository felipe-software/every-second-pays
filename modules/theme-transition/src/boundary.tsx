import { Component, type PropsWithChildren } from "react";
import { AppState, type NativeEventSubscription } from "react-native";

import { attachCommitScheduler, commitPendingTransition, flushLookBurst } from "./transition";

// Captures after the change renders but before it commits, so press feedback stays live.
export class ThemeTransitionBoundary extends Component<PropsWithChildren> {
    private appState: NativeEventSubscription | null = null;

    componentDidMount() {
        attachCommitScheduler(() => this.forceUpdate());
        this.appState = AppState.addEventListener("change", (state) => {
            if (state !== "active") flushLookBurst();
        });
    }

    componentWillUnmount() {
        attachCommitScheduler(null);
        this.appState?.remove();
    }

    getSnapshotBeforeUpdate() {
        commitPendingTransition();
        return null;
    }

    componentDidUpdate() {}

    render() {
        return this.props.children;
    }
}
