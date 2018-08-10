Blockly.defineBlocksWithJsonArray([{
    "type": "eng_lamp",
    "message0": "Muda estado da lampada %1 %2 para %3",
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
},
{
    "type": "eng_lamp2",
    "message0": "Muda estado da lampada %1 %2 para %3 %4",
    "args0": [
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "A",
        "check": "Number"
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "B",
        "check": "Boolean"
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

Blockly.JavaScript['eng_lamp2'] = function(block) {
    var value_a = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_ATOMIC);
    var value_b = Blockly.JavaScript.valueToCode(block, 'B', Blockly.JavaScript.ORDER_ATOMIC);
    
    var code = 'setLight(' + value_a + ', ' + value_b + ');\n';
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