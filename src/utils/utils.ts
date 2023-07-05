export class Utils {
    static isValidJson(jsonString: string): boolean {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (e) {
            return false;
        }
    }
}
