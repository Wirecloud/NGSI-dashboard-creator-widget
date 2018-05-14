/* globals $, MashupPlatform, MockMP, NGSIDashboardCreator */

(function () {

    "use strict";

    describe("NGSIDashboardCreator", function () {

        var widget;

        beforeAll(function () {
            window.MashupPlatform = new MockMP({
                type: 'widget'
            });
        });

        beforeEach(function () {
            MashupPlatform.reset();
            widget = new NGSIDashboardCreator();
        });

        it("Dummy test", function () {
            expect(widget).not.toBe(null);
        });

    });

})();
