export declare class HtmlSafeString {
    private readonly strings;
    private readonly values;
    constructor(strings: ReadonlyArray<string>, values: unknown[]);
    toString(): string;
}
export declare type HtmlValue = string | number | boolean | HtmlSafeString | undefined | null | HtmlValue[];
export declare function html(strings: TemplateStringsArray, ...values: HtmlValue[]): HtmlSafeString;
/**
 * Pre-escpapes the rendered HTML. Useful for when you want to inline the HTML
 * in something else, for instance in a `data-content` attribute for a Bootstrap
 * popover.
 */
export declare function escapeHtml(html: HtmlSafeString): HtmlSafeString;
/**
 * Will render the provided value without any additional escaping. Use carefully
 * with user-provided data.
 *
 * @param value The value to render.
 * @returns An {@link HtmlSafeString} representing the provided value.
 */
export declare function unsafeHtml(value: string): HtmlSafeString;
