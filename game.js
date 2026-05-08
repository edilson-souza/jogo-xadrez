/**
 * Classe responsável por gerenciar toda a lógica do jogo
 */
class ChessGame {
    constructor(boardId, statusId, pgnId) {
        this.logic = new Chess(); // O "cérebro" (chess.js)
        this.boardId = boardId;
        this.statusEl = document.getElementById(statusId);
        this.pgnEl = document.getElementById(pgnId);
        this.board = null;

        this.init();
    }

    // Inicializa o tabuleiro visual
    init() {
        const settings = {
            draggable: true,
            position: 'start',
            onDragStart: (src, piece) => this.validatePiece(piece),
            onDrop: (src, tgt) => this.handleMove(src, tgt),
            onSnapEnd: () => this.syncBoard(),
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };

        this.board = Chessboard(this.boardId, settings);
        this.updateStatus();
    }

    // Regra: Só pode arrastar peças se o jogo não acabou e se for a cor da vez
    validatePiece(piece) {
        if (this.logic.game_over()) return false;
        
        const turn = this.logic.turn(); // 'w' ou 'b'
        if ((turn === 'w' && piece.search(/^b/) !== -1) ||
            (turn === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }

    // Executa a jogada na lógica e verifica se é válida
    handleMove(source, target) {
        const move = this.logic.move({
            from: source,
            to: target,
            promotion: 'q' // Promoção automática para Rainha
        });

        if (move === null) return 'snapback'; // Movimento ilegal volta a peça

        this.updateStatus();
    }

    // Garante que o visual (ex: Roque) reflita a lógica
    syncBoard() {
        this.board.position(this.logic.fen());
    }

    // Atualiza as mensagens de Xeque, Mate e Vez do Jogador
    updateStatus() {
        let status = "";
        const player = (this.logic.turn() === 'w') ? "Brancas" : "Pretas";

        if (this.logic.in_checkmate()) {
            status = `FIM DE JOGO: ${player} perderam (Mate).`;
        } else if (this.logic.in_draw()) {
            status = "FIM DE JOGO: Empate.";
        } else {
            status = `Vez das ${player}`;
            if (this.logic.in_check()) status += " (XEQUE!)";
        }

        this.statusEl.innerText = status;
        this.pgnEl.innerText = this.logic.pgn();
    }

    // Reinicia o objeto para uma nova partida
    reset() {
        this.logic.reset();
        this.board.start();
        this.updateStatus();
    }
}

// Criação da instância do jogo ao carregar a página
const myGame = new ChessGame('boardContainer', 'status', 'pgn');

// Evento do botão de Reset
document.getElementById('resetBtn').addEventListener('click', () => {
    myGame.reset();
});