describe('multiprop parser - multiple items', function() {
    it('can parse a space separated value string', function() {
        var props = parseMultiProp('x100 y100');
        expect(props.x).toEqual(100);
        expect(props.y).toEqual(100);
    });
    
    it('can parse a comma separated value string', function() {
        var props = parseMultiProp('x100,y100');
        expect(props.x).toEqual(100);
        expect(props.y).toEqual(100);
    });
    
    it('can parse a space separated value string, with complex props', function() {
        var props = parseMultiProp('x!100 y-200 background-color:red');
        expect(props.x).toEqual('!100');
        expect(props.y).toEqual(-200);
        expect(props['background-color']).toEqual('red');
    });
});