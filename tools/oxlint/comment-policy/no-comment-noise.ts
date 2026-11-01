import { defineRule } from "@oxlint/plugins";

const MAX_COMMENT_LENGTH = 100;
const TOOL_DIRECTIVE =
    /^\s*\*?\s*(eslint|oxlint|prettier|oxfmt|fallow|react-doctor|@ts-|@type|@satisfies|#region|#endregion)/u;
const SECTION_HEADER = /^\s*[-=*#_~]{3,}|[-=*#_~]{3,}\s*$/u;
const NARRATION = /^\s*(added|removed|changed|updated|refactored|now uses|no longer|previously|used to)\b/iu;
const COMMENTED_OUT_CODE =
    /^\s*(import\s|export\s|const\s|let\s|var\s|return\s|await\s|if\s*\(|for\s*\(|<[A-Z]|[\w.]+\(.*\);?\s*$)|[;{}]\s*$/u;
const LINK = /https?:\/\//u;

type PolicyComment = {
    type: string;
    value: string;
    loc: { start: { line: number; column: number }; end: { line: number; column: number } };
};

function violationOf(comment: PolicyComment): string | null {
    if (TOOL_DIRECTIVE.test(comment.value)) return null;
    if (comment.type === "Block" && comment.value.startsWith("*")) return "docblock";
    if (comment.loc.start.line !== comment.loc.end.line) return "multiLine";
    if (SECTION_HEADER.test(comment.value)) return "sectionHeader";
    if (NARRATION.test(comment.value)) return "narration";
    if (COMMENTED_OUT_CODE.test(comment.value)) return "commentedOutCode";
    if (comment.value.trim().length > MAX_COMMENT_LENGTH && !LINK.test(comment.value)) return "tooLong";
    return null;
}

function startsItsLine(comment: PolicyComment, lines: readonly string[]): boolean {
    return lines[comment.loc.start.line - 1].slice(0, comment.loc.start.column).trim() === "";
}

function continuesPrevious(
    comment: PolicyComment,
    previous: PolicyComment | undefined,
    lines: readonly string[],
): boolean {
    return (
        previous !== undefined &&
        comment.type === "Line" &&
        previous.type === "Line" &&
        comment.loc.start.line === previous.loc.end.line + 1 &&
        startsItsLine(comment, lines) &&
        startsItsLine(previous, lines)
    );
}

export const noCommentNoiseRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Enforce the checkable part of the comment policy in AGENTS.md: one short line that explains why.",
        },
        messages: {
            docblock: "Remove this docblock. Names and types describe what code does.",
            multiLine: "Keep a comment to one short line, or remove it.",
            sectionHeader: "Remove this section header. Split the file if it needs sections.",
            narration: "Remove this narration. Git history records what changed.",
            commentedOutCode: "Remove this commented-out code. Git history keeps it.",
            tooLong: `Keep a comment under ${MAX_COMMENT_LENGTH} characters, or remove it.`,
        },
    },
    createOnce(context) {
        return {
            Program() {
                const { lines } = context.sourceCode;
                const comments = context.sourceCode.getAllComments() as unknown as PolicyComment[];
                comments.forEach((comment, index) => {
                    const previous = comments[index - 1];
                    const messageId = continuesPrevious(comment, previous, lines) ? "multiLine" : violationOf(comment);
                    if (messageId !== null) context.report({ loc: comment.loc, messageId });
                });
            },
        };
    },
});
