Blockly.defineBlocksWithJsonArray([{
    "type": "eng_lamp",
    "message0": "Muda estado da lampada para %1 %2 %3",
    "args0": [
        {
            "type": "input_dummy"
        },
        {
            "type": "field_dropdown",
            "name": "num",
            "options": [
                [
                    "azul (1)",
                    "1"
                ],
                [
                    "vermelho (2)",
                    "2"
                ],
                [
                    "verde (3)",
                    "3"
                ],
                [
                    "rosa (4)",
                    "4"
                ]
            ]
        },
        {
            "type": "field_dropdown",
            "name": "estado",
            "options": [
                [
                    "Ligada",
                    "ON"
                ],
                [
                    "Desligada",
                    "OFF"
                ]
            ]
        }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "controla a lampada",
    "helpUrl": ""
}]);

Blockly.JavaScript['eng_lamp'] = function (block) {
    var dropdown_num = block.getFieldValue('num');
    var dropdown_estado = block.getFieldValue('estado');
    
    var code = 'setLight(' + parseInt(dropdown_num) + ', ' + (dropdown_estado === 'ON' ? true : false) + ');\n';
    return code;
};

function initInterpreterSetLight(interpreter, scope) {
    // Ensure function name does not conflict with variable names.
    Blockly.JavaScript.addReservedWords('setLight');

    var wrapper = function ( num, isOn ) {
        setLight( num, isOn.data )
    };

    interpreter.setProperty(scope, 'setLight', interpreter.createNativeFunction(wrapper));
}