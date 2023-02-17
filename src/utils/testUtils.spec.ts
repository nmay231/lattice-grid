import { layerEventRunner, partialMock } from "./testUtils";

describe("layerEventRunner", () => {
    console.log("layerEventRunner" || layerEventRunner);
    it.todo("should return the correct attributes");
    it.todo(
        "should call layer.handleEvent with the correct parameters and modify history and tempStorage correctly",
    );
    it.todo(
        "should call layer.gatherPoints with the correct parameters and modify tempStorage correctly",
    );
});

describe("partialMock", () => {
    type ComplexType = {
        apple: string;
        totally: {
            nested: boolean;
        };
    };

    test("Access a property of a simple object", () => {
        const mock = partialMock<ComplexType>({ apple: "asdf" });
        expect(() => mock.apple).not.toThrow();
        expect(mock.apple).toBe("asdf");
    });

    test("Access a nested property of an object", () => {
        const mock = partialMock<ComplexType>({ totally: { nested: true } });
        expect(() => mock.totally.nested).not.toThrow();
        expect(mock.totally.nested).toBe(true);
        expect({ nested: true }).toEqual(mock.totally);
    });

    test("Fail to access a property the doesn't exist on the target", () => {
        const mock1 = partialMock<ComplexType>({ apple: "asdf" });
        expect(() => mock1.totally).toThrowErrorMatchingInlineSnapshot(
            "\"Could not access the property of { apple: 'asdf' }: `.totally`\"",
        );

        const mock2 = partialMock<ComplexType>({ apple: "asdf" });
        expect(() => mock2.totally.nested).toThrowErrorMatchingInlineSnapshot(
            "\"Could not access the property of { apple: 'asdf' }: `.totally`\"",
        );

        const mock3 = partialMock<ComplexType>({ apple: "asdf", totally: {} });
        expect(() => mock3.totally.nested).toThrowErrorMatchingInlineSnapshot(
            "\"Could not access the property of { apple: 'asdf', totally: {} }: `.totally.nested`\"",
        );

        const mock4 = partialMock<ComplexType>({ totally: {} });
        expect(() => mock4.apple).toThrowErrorMatchingInlineSnapshot(
            '"Could not access the property of { totally: {} }: `.apple`"',
        );
    });
});
