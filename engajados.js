/**
 * Configs
 */
var basicCodeText = '// Código em Javascript\n\n';

var Code = {};

var outputArea = document.getElementById('output');
var codeOutput = document.getElementById('codigo')
var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');
var myInterpreter = null;
var runner;

var latestCode = '';

var building = false;

Code.init = function () {

    initSVG();

    // Exit is used to signal the end of a script.
    Blockly.JavaScript.addReservedWords('exit');

    document.getElementById('codigo').innerHTML = basicCodeText;


    var onResize = function () {
        // Compute the absolute coordinates and dimensions of blocklyArea.
        var element = blocklyArea;
        var x = 0;
        var y = 0;
        do {
            x += element.offsetLeft;
            y += element.offsetTop;
            element = element.offsetParent;
        } while (element);
        // Position blocklyDiv over blocklyArea.
        blocklyDiv.style.left = x + 'px';
        blocklyDiv.style.top = y + 'px';
        blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
        blocklyDiv.style.height = (blocklyArea.offsetHeight - 30) + 'px';

        Blockly.svgResize(Code.workspacePlayground);
    }

    window.addEventListener('resize', onResize, false);

    for (var messageKey in MSG) {
        if (messageKey.indexOf('cat') == 0) {
            Blockly.Msg[messageKey.toUpperCase()] = MSG[messageKey];
        }
    }

    // Construct the toolbox XML, replacing translated variable names.
    var toolboxText = document.getElementById('toolbox').outerHTML;
    toolboxText = toolboxText.replace(/(^|[^%]){(\w+)}/g,
        function (m, p1, p2) {
            return p1 + MSG[p2];
        });
    var toolboxXml = Blockly.Xml.textToDom(toolboxText);

    Code.workspacePlayground = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true
        },
        zoom: {
            controls: true,
            wheel: false,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        },
    });

    Code.workspacePlayground.addChangeListener(UpdateCode);

    onResize();

    fillCode();
}

function UpdateCode(event) {
    // console.log( event );
    var code = Blockly.JavaScript.workspaceToCode(Code.workspacePlayground);

    var cleanCode = '';
    // remove highlight lines
    /*
    code.split('\n').map(function (line) {
        if (line.indexOf('highlightBlock') === -1)
            cleanCode += (line + '\n');
    });
    codeOutput.innerHTML = basicCodeText + cleanCode;
    */
    codeOutput.innerHTML = basicCodeText + code;

    initLights();

    generateCodeAndLoadIntoInterpreter();
}

function generateCodeAndLoadIntoInterpreter() {
    // Generate JavaScript code and parse it.
    // Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    // Blockly.JavaScript.addReservedWords('highlightBlock');
    latestCode = Blockly.JavaScript.workspaceToCode(Code.workspacePlayground);

    resetStepUi(true);

    if( !building ) runInit();
}

function resetStepUi(clearOutput) {
    // Code.workspacePlayground.highlightBlock(null);
    // runButton.disabled = '';

    if (clearOutput) {
       outputArea.value = 'SAÍDA:\n=================';
    }
}

function initApi(interpreter, scope) {
    // Add an API function for the alert() block, generated for "text_print" blocks.
    var wrapper = function (text) {
        text = text ? text.toString() : '';
        outputArea.value = outputArea.value + '\n' + text;
        outputArea.scrollTo(0, 1000000000);
    };
    interpreter.setProperty(scope, 'alert',
        interpreter.createNativeFunction(wrapper));

    // Add an API function for the prompt() block.
    var wrapper = function (text) {
        text = text ? text.toString() : '';
        return interpreter.createPrimitive(prompt(text));
    };
    interpreter.setProperty(scope, 'prompt',
        interpreter.createNativeFunction(wrapper));

    // Add an API for the wait block.  See wait_block.js
    initInterpreterWaitForSeconds(interpreter, scope);

    // TODO:
    initInterpreterSetLight(interpreter, scope);

    // Add an API function for highlighting blocks.
    /*
    var wrapper = function (id) {
        id = id ? id.toString() : '';
        return interpreter.createPrimitive(highlightBlock(id));
    };
    interpreter.setProperty(scope, 'highlightBlock',
        interpreter.createNativeFunction(wrapper));
    */
}


/*
function highlightBlock(id) {
    Code.workspacePlayground.highlightBlock(id);
    highlightPause = true;
}
*/
function runInit() {
    console.log( 'INICIAR' );

    // Begin execution
    myInterpreter = new Interpreter('', initApi);    
    myInterpreter.appendCode(latestCode + 'if( iniciar ) iniciar()');

    var runner = function () {
        if (myInterpreter) {
            var hasMore = myInterpreter.run();
            if (hasMore) {
                // Execution is currently blocked by some async call.
                // Try again later.
                setTimeout(runner, 10);
            } else {
                // Program is complete.
                outputArea.value += '\n\n<< Inicialização completa >>';
            }
        }
    };
    runner();
}

function runFunc( code ) {
    // Begin execution
    // highlightPause = false;
    var interpreter = new Interpreter('', initApi);
    interpreter.stateStack[0].scope = myInterpreter.stateStack[0].scope;
    interpreter.appendCode(code + '()'); // TODO: 'if( ' + code + ' ) ' + code + '()'

    var runner = function () {
        if (interpreter) {
            var hasMore = interpreter.run();
            if (hasMore) {
                // Execution is currently blocked by some async call.
                // Try again later.
                setTimeout(runner, 10);
            } else {
                // Program is complete.
                // outputArea.value += '\n\n<< Programa completo >>';
                // resetInterpreter();
                // resetStepUi(false);
            }
        }
    };
    runner();
}

// document.getElementById('clean_output').addEventListener('click', function(){ resetStepUi(true); });

function initSVG() {
    var draw = SVG('controles').size( 565, 96 );

    var ajax = new XMLHttpRequest()
    ajax.open('GET', './controles_v1.svg', true)
    ajax.onload = function(e) {
        draw.svg(ajax.responseText)
        initLights();
        initButtons();
    }
    ajax.send()    
}

function initLights() {
    for(var i=1; i<=4; i++) {
        setLight( i, false );
    }
}
function initButtons() {
    for(var i=1; i<=4; i++) {
        setButton( i, false );
        bindButtonEvents( i );
    }
}

function bindButtonEvents( num ) {
    var botParent = SVG.get('bot' + num);

    var botOn = SVG.get('bot' + num + '_up');
    var botOff = SVG.get('bot' + num + '_down');

    botParent.mousedown( function() {
        botOn.hide();
        botOff.show();
    });
    botParent.mouseup( function() {
        botOn.show();
        botOff.hide();
        runFunc( 'botao'+num )
    });
}

function setLight( num, isOn ) {
    var luzOn = SVG.get('luz' + num + '_on');
    var luzOff = SVG.get('luz' + num + '_off');

    if( isOn ) {
        luzOn.show();
        luzOff.hide();
    } else {
        luzOn.hide();
        luzOff.show();
    }
}

function setButton( num, isDown ) {
    var botOn = SVG.get('bot' + num + '_up');
    var botOff = SVG.get('bot' + num + '_down');

    if( isDown ) {        
        botOn.hide();
        botOff.show();
    } else {
        botOn.show();
        botOff.hide();
    }
}

function fillCode( qual ){
    building = true;
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">2</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="controls_repeat_ext" id=",zqx_71CpEV%[m2gn;nC"><value name="TIMES"><shadow type="math_number" id="/vLQV;5avIw9MfKKgq)e"><field name="NUM">4</field></shadow><block type="variables_get" id="ZcGn`6rXr(-wc2K1PI-#"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><statement name="DO"><block type="eng_lamp" id="=o0e|?yp`F9g7iBZf?y-"><field name="estado">ON</field><next><block type="wait_seconds" id="Z.CV#][4~zvNd5^WP7M}"><field name="SECONDS">1</field><next><block type="eng_lamp" id="h:0mp;p(1*5vF_yyLv@/"><field name="estado">OFF</field><next><block type="wait_seconds" id=",vfg~8Qd%6Y),6G0.iU["><field name="SECONDS">1</field></block></next></block></next></block></next></block></statement></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="630" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_repeat_ext" id="0c%%wS4}(;qTuFIW67;b"><value name="TIMES"><shadow type="math_number" id="pYmME9R}-k?Biy9n8,vV"><field name="NUM">2</field></shadow><block type="variables_get" id="a^(m,rN}8p*$1hG[xd#k"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><statement name="DO"><block type="wait_seconds" id="F7zW+z4FqLHG!.^vo7G@"><field name="SECONDS">1</field><next><block type="text_print" id="8j~O5MJ%CU(xux)3x-)m"><value name="TEXT"><shadow type="text" id="[tjy-Z7m)K0{d(ByJPrU"><field name="TEXT">abc</field></shadow></value><next><block type="wait_seconds" id="aU%_[?HSkifAr/uSz8g="><field name="SECONDS">1</field><next><block type="text_print" id="iijViKdkGZ77HsG^W?9?"><value name="TEXT"><shadow type="text" id="{B.nK3:qP^csN+[JD,g["><field name="TEXT">123</field></shadow></value></block></next></block></next></block></next></block></statement></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">2</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="330" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="=vW8l|m6?4oKD@T}D[}k"><value name="TEXT"><shadow type="text" id="4!E,UWk:aOk#Su*xs@Xj"><field name="TEXT">abc</field></shadow></value><next><block type="wait_seconds" id="^xE0w1+erWdXT~i4*f$,"><field name="SECONDS">5</field><next><block type="text_print" id="ZWl0tM4ksa}u{b{th3*`"><value name="TEXT"><shadow type="text" id="p^wM1vRhk5d7gE+UsKT*"><field name="TEXT">OK func2</field></shadow></value></block></next></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">2</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_repeat_ext" id="FC3wU^=8EA/y]VnmwDS9"><value name="TIMES"><shadow type="math_number" id="8TKw1XDbLKl/hgIp2wet"><field name="NUM">10</field></shadow></value><statement name="DO"><block type="eng_lamp" id="Xz3E+^5}k]]lH(PoreX$"><field name="estado">ON</field><next><block type="wait_seconds" id=";Xp,{9]X;C!a50kRcTC/"><field name="SECONDS">1</field><next><block type="eng_lamp" id="GD5(iiRsK8pZ_t-=f~!V"><field name="estado">OFF</field><next><block type="wait_seconds" id="be(bAI[a=m+8,f{|u1Me"><field name="SECONDS">1</field></block></next></block></next></block></next></block></statement><next><block type="text_print" id=",Rptu[Z^JWBcKcyamE:g"><value name="TEXT"><shadow type="text" id="7khF`EvJ5Krh~:QRTA)w"><field name="TEXT">OK func1</field></shadow></value></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="490" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_repeat_ext" id="G5-1!B9NLw/Lzwz_(T=i"><value name="TIMES"><shadow type="math_number" id="$^$n5KwmQ(|2$d9sW_%|"><field name="NUM">10</field></shadow></value><statement name="DO"><block type="text_print" id="=vW8l|m6?4oKD@T}D[}k"><value name="TEXT"><shadow type="text" id="4!E,UWk:aOk#Su*xs@Xj"><field name="TEXT">abc</field></shadow></value><next><block type="wait_seconds" id="^xE0w1+erWdXT~i4*f$,"><field name="SECONDS">1</field></block></next></block></statement><next><block type="text_print" id="ZWl0tM4ksa}u{b{th3*`"><value name="TEXT"><shadow type="text" id="p^wM1vRhk5d7gE+UsKT*"><field name="TEXT">OK func2</field></shadow></value></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">123</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="Z?e},xRJ:gQOGhdW-+e]"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="B[o_Me7,xU%A_L/RI]xL"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="330" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="|o*RB-TCtv/3Ad3ajVDc"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="v{!.(=5S29*a08cMDlNp"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="^xE0w1+erWdXT~i4*f$,"><field name="SECONDS">5</field><next><block type="variables_set" id="drl@s,r8/5e6}h`)g7s_"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bN)!Y=1_(I+Ob#?T]#E]"><field name="NUM">321</field></block></value><next><block type="text_print" id="ZWl0tM4ksa}u{b{th3*`"><value name="TEXT"><shadow type="text" id="p^wM1vRhk5d7gE+UsKT*"><field name="TEXT">OK func2</field></shadow></value></block></next></block></next></block></next></block></statement></block></xml>';
    //var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">123</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="event_block" id="xR8)gSL{;Cm5Lw^5FM4M" x="130" y="210"><statement name="NAME"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="Z?e},xRJ:gQOGhdW-+e]"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="B[o_Me7,xU%A_L/RI]xL"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">123</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="event_block" id="xR8)gSL{;Cm5Lw^5FM4M" x="130" y="210"><statement name="NAME"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="Z?e},xRJ:gQOGhdW-+e]"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="B[o_Me7,xU%A_L/RI]xL"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></next></block></statement></block><block type="event_block" id="I,zJ$T|oM`9}l`=PZDAB" x="470" y="210"><statement name="NAME"><block type="text_print" id="SWwwZor|D;q?eDG:h#[U"><value name="TEXT"><shadow type="text" id="JrYZp5OIEo!zwtdU[s{D"><field name="TEXT">OK func1</field></shadow></value><next><block type="wait_seconds" id="FcURZrY1(c|aqQ2QgGsP"><field name="SECONDS">10</field><next><block type="text_print" id="PtKc{=nx4h*ku5#[}]0I"><value name="TEXT"><shadow type="text" id="xW)i[t0hR9F[;;@){ZHo"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></statement></block></xml>';
    
    switch( qual ) {
        case 'basico':
            Code.workspacePlayground.clear();
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="j@Mm=rLq|zbWR?b+5{0R">var1</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="-190"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="9jJ[c)C?58w}_O[3,(Yj"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_number" id="u4Bj3O1Ufka7?e3`$NDw"><field name="NUM">1</field></block></value></block></statement></block><block type="procedures_defnoreturn" id=":5z$*!r1BaV%1WW2V3T+" x="10" y="-90"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="UdN`l][qC{Y:!7]sH|b`"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_arithmetic" id="(nF?@Nb~q78F$!|~!VwY"><field name="OP">ADD</field><value name="A"><shadow type="math_number" id="voU~VSUS42oo;?D!,OM*"><field name="NUM">1</field></shadow><block type="variables_get" id="pY.!~$.bG!ZWhG}-G8MP"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value><value name="B"><shadow type="math_number" id="zrQ(#NBp0j!Z:7]_(ujD"><field name="NUM">1</field></shadow></value></block></value><next><block type="text_print" id="Xyv-vG(1R$Lk;qqK*aBy"><value name="TEXT"><shadow type="text" id="}Col_2vL*P;lN/hQ6nLW"><field name="TEXT">abc</field></shadow><block type="variables_get" id="r~G9ynQ44u`F/]5FAN)="><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value></block></next></block></statement></block><block type="procedures_defnoreturn" id="Rn78.OC_x]s*0})[AT?+" x="10" y="70"><field name="NAME">botao2</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="2x~C~]AX-uZ[awmUV/-H"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_arithmetic" id="Y+EqGm;e)$gIILg#w^X["><field name="OP">MULTIPLY</field><value name="A"><shadow type="math_number" id="voU~VSUS42oo;?D!,OM*"><field name="NUM">1</field></shadow><block type="variables_get" id="DXtv09R?DkLgI,5I~H-f"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value><value name="B"><shadow type="math_number" id="a?8sKa:u-KR{d3*O#g@J"><field name="NUM">2</field></shadow></value></block></value><next><block type="text_print" id="zA[!X?.KTcpk=aUB=gj+"><value name="TEXT"><shadow type="text" id="}Col_2vL*P;lN/hQ6nLW"><field name="TEXT">abc</field></shadow><block type="variables_get" id="O{7`nwJP(,dM]fZH^{HA"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value></block></next></block></statement></block></xml>';
            break;
        case 'lampada':
            Code.workspacePlayground.clear();
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="um{yv$6hPM_CzWh=!:Sh">acessa</variable><variable type="" id="gydlVOnq6TP/zJojclM4">acessa2</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="-130"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value><next><block type="variables_set" id="^HErhAEC?LLY^TzB$Dq9"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field><value name="VALUE"><block type="math_number" id="!M+~tEp~5*HqzBwrU$lM"><field name="NUM">0</field></block></value><next><block type="variables_set" id="w:yq(Ou~]_RuAmww*RIh"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field><value name="VALUE"><block type="math_number" id="P6kGQhLwl_p!rdU1U]T;"><field name="NUM">0</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="fGU~-F^r-c0eh9V@OT!J" x="330" y="-110"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_if" id="Q+j%Y=WKW4aP-!J}v0#m"><mutation else="1"></mutation><value name="IF0"><block type="logic_compare" id="]:)u,M@)Xd]5L0m|nrzP"><field name="OP">EQ</field><value name="A"><block type="variables_get" id="D,oSymjwM,~0d9n=XqTo"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field></block></value><value name="B"><block type="math_number" id="w^Evm$gDaU=o-uLMMX:*"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="eng_lamp" id="2N8%J{AO[DBR]kgB6%8U"><field name="num">1</field><field name="estado">ON</field><next><block type="variables_set" id="2t$ds,~=3p(|A[eg/WLP"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field><value name="VALUE"><block type="math_number" id="y:wY%_Z)j6yuyNgtEAp9"><field name="NUM">1</field></block></value></block></next></block></statement><statement name="ELSE"><block type="eng_lamp" id="0a_;A@zGu7pv[y2bqGK*"><field name="num">1</field><field name="estado">OFF</field><next><block type="variables_set" id="l7MM](.%h5c.nGWB6jy%"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field><value name="VALUE"><block type="math_number" id="ZpSSQzy?UWP=w%LQtJ:M"><field name="NUM">0</field></block></value></block></next></block></statement></block></statement></block><block type="procedures_defnoreturn" id=")*3rAc_7*80+/MX__D9K" x="330" y="170"><field name="NAME">botao2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_if" id="=.zMgup)Z.wqnN2QogIc"><mutation else="1"></mutation><value name="IF0"><block type="logic_compare" id="HjAH`qQ}VEfbgy?{bYyX"><field name="OP">EQ</field><value name="A"><block type="variables_get" id="]MjP8sHp;a$k/kRP9hh1"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field></block></value><value name="B"><block type="math_number" id="(+:?^+DBBuxT0VCvtW=:"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="eng_lamp" id="x?hXoX:/TVj?A18rY][i"><field name="num">2</field><field name="estado">ON</field><next><block type="variables_set" id="ABYN$wON$:OMCF5ckC58"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field><value name="VALUE"><block type="math_number" id="Jo$_$P#NV,p{U4w8(hj!"><field name="NUM">1</field></block></value></block></next></block></statement><statement name="ELSE"><block type="eng_lamp" id=")Z]L5vE)pHKB1ScoqB#@"><field name="num">2</field><field name="estado">OFF</field><next><block type="variables_set" id="+/n$/jA1aoibN00DI|H6"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field><value name="VALUE"><block type="math_number" id="enF)Bu:Z2F2ZkB9`c@F+"><field name="NUM">0</field></block></value></block></next></block></statement></block></statement></block></xml>';
            break;
        default:
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-150"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value></block></statement></block></xml>';
    }
    
    var xml = Blockly.Xml.textToDom(text);
    Blockly.Xml.domToWorkspace(xml, Code.workspacePlayground);

    setTimeout( function(){
        building = false;
        UpdateCode();
    }, 2000);
};

window.addEventListener('load', Code.init);