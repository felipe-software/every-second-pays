import * as SplashScreen from "expo-splash-screen";

import type { ArtboardPoint } from "./customize-layout";
import { CustomizeStep } from "./customize-step";
import { type IntroEvents, IntroStep } from "./intro-step";
import type { Look } from "./look";
import { type NotificationAnswer, NotificationsStep } from "./notifications-step";
import type { PageId } from "./onboarding-background";
import { PrivacyStep } from "./privacy-step";
import { WidgetStep } from "./widget-step";

export type OnboardingPageProps = {
    page: PageId;
    index: number;
    playing: boolean;
    reduced: boolean;
    introEvents: IntroEvents;
    askingSystem: boolean;
    notifications: NotificationAnswer;
    board: Look;
    onPreview: (look: Look, at: ArtboardPoint) => void;
    onPick: (look: Look, at: ArtboardPoint) => void;
};

export function OnboardingPage({
    page,
    index,
    playing,
    reduced,
    introEvents,
    askingSystem,
    notifications,
    board,
    onPreview,
    onPick,
}: OnboardingPageProps) {
    if (page === "intro") {
        return (
            <IntroStep
                index={index}
                playing={playing}
                reduced={reduced}
                onSkipReady={introEvents.onSkipReady}
                onImpact={introEvents.onImpact}
                onLift={introEvents.onLift}
                onReplay={introEvents.onReplay}
                onDone={introEvents.onDone}
                onArtReady={() => SplashScreen.hideAsync()}
            />
        );
    }
    if (page === "widget") return <WidgetStep index={index} playing={playing} reduced={reduced} />;
    if (page === "privacy") return <PrivacyStep index={index} playing={playing} reduced={reduced} />;
    if (page === "notifications") {
        return (
            <NotificationsStep
                index={index}
                playing={playing && !askingSystem}
                reduced={reduced}
                answer={notifications}
            />
        );
    }
    return (
        <CustomizeStep
            index={index}
            playing={playing}
            reduced={reduced}
            board={board}
            onPreview={onPreview}
            onPick={onPick}
        />
    );
}
