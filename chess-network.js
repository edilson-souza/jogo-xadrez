class ChessNetwork {
    constructor(game) {
        this.game = game;
        this.pusher = new Pusher('8c34ff47496131589002', {
            cluster: 'sa1',
            forceTLS: true
        });

        const urlParams = new URLSearchParams(window.location.search);
        this.roomID = urlParams.get('room') || Math.random().toString(36).substring(7);
        
        if (!urlParams.get('room')) {
            window.history.pushState({}, '', `?room=${this.roomID}`);
        }

        this.channel = this.pusher.subscribe(`room-${this.roomID}`);
        
        this.channel.bind('client-opponent-move', (data) => {
            if (data.color !== this.game.playerColor) {
                this.game.executeMove(data.from, data.to, data.promotion, false);
            }
        });
    }

    sendMove(moveData) {
        // Nota: Trigger direto do cliente exige que 'Client Events' esteja ativado no Dashboard do Pusher
        this.channel.trigger('client-opponent-move', moveData);
    }
}