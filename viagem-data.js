// ======================
// Dados da Viagem Lisboa — edita este ficheiro à vontade: apaga um dos 4
// dias abaixo, muda horas, acrescenta links do Google Maps em "mapsUrl".
//
// Formato de cada atividade: string simples, ou { nome, mapsUrl } se
// quiseres ligar a um sítio no Google Maps.
// ======================
window.TRIP_INFO = {
    ida: { label: 'Ida', texto: 'Autocarro terça às 10:20, Sete Rios → Lisboa, ~3h, 6,20 €/pessoa' },
    regresso: { label: 'Regresso', texto: 'Autocarro sexta às 15:30, Sete Rios (ajustar a data conforme os 3 dias finais escolhidos)' },
    alojamento: { label: 'Alojamento', texto: 'Casa de amigo — Rua Estêvão Amarante 40, 2620-274 Ramada (Odivelas). As malas ficam sempre lá.' },
    transportes: { label: 'Transportes em Lisboa', texto: 'Ainda não temos Navegante Jovem → comprar Cartão Navegante Ocasional + carregar ~20 € em Zapping por pessoa' },
    filosofia: { label: 'Filosofia da viagem', texto: 'Ritmo tranquilo, sem correr, margem entre atividades. Comer sobretudo sandes/snacks/água de supermercado — restaurante só em ocasiões especiais.' }
};

window.TRIP_DAYS = [
    {
        id: 'dia1',
        titulo: 'Terça — Alfama & Feira da Ladra',
        periodos: [
            {
                titulo: 'Chegada',
                hora: '10:20',
                atividades: ['Chegada a Lisboa', 'Ir para casa do amigo, deixar as malas', 'Descansar um pouco']
            },
            {
                titulo: 'Feira da Ladra & Alfama',
                atividades: [
                    { nome: 'Feira da Ladra', mapsUrl: '' },
                    { nome: 'Panteão Nacional (exterior)', mapsUrl: '' },
                    { nome: 'Alfama', mapsUrl: '' },
                    { nome: 'Portas do Sol', mapsUrl: '' },
                    { nome: 'Miradouro de Santa Luzia', mapsUrl: '' },
                    'Ruas típicas',
                    'Lojas de recordações',
                    'Artistas de rua'
                ],
                notas: 'Almoço: sandes'
            },
            {
                titulo: 'Fim de dia',
                atividades: [
                    { nome: 'Miradouro da Senhora do Monte', mapsUrl: '' },
                    'Pôr do sol',
                    'Regresso à Ramada'
                ]
            }
        ]
    },
    {
        id: 'dia2',
        titulo: 'Quarta — Parque das Nações & Oceanário',
        periodos: [
            {
                titulo: 'Manhã',
                atividades: [
                    { nome: 'Jardim Garcia de Orta', mapsUrl: '' },
                    { nome: 'Passeio Ribeirinho', mapsUrl: '' },
                    { nome: 'Marina', mapsUrl: '' },
                    { nome: 'Centro Vasco da Gama', mapsUrl: '' }
                ],
                notas: 'Almoço: sandes'
            },
            {
                titulo: 'Oceanário',
                hora: '14:30–17:00',
                atividades: [{ nome: 'Oceanário de Lisboa', mapsUrl: '' }],
                custoEstimado: '22 €/pessoa'
            },
            {
                titulo: 'Tarde',
                atividades: ['Passear junto ao Tejo']
            },
            {
                titulo: 'Eclipse & noite',
                hora: '18:30',
                atividades: ['Eclipse junto ao rio', 'Ficar até anoitecer', 'Regresso à Ramada']
            }
        ]
    },
    {
        id: 'dia3',
        titulo: 'Quinta — Belém, LX Factory & Colombo',
        periodos: [
            {
                titulo: 'Belém',
                atividades: [
                    { nome: 'Torre de Belém', mapsUrl: '' },
                    { nome: 'Mosteiro dos Jerónimos', mapsUrl: '' },
                    { nome: 'Padrão dos Descobrimentos', mapsUrl: '' },
                    { nome: 'Pastéis de Belém', mapsUrl: '' }
                ]
            },
            {
                titulo: 'LX Factory',
                atividades: [
                    'Passear, lojas',
                    { nome: 'Livraria Ler Devagar', mapsUrl: '' }
                ]
            },
            {
                titulo: 'Centro Colombo',
                atividades: ['Passear, lojas', 'Jantar']
            },
            {
                titulo: 'Noite (opcional)',
                atividades: ['Escape Room ou Bowling', 'Regresso à Ramada']
            }
        ]
    },
    {
        id: 'dia4',
        titulo: 'Sexta — Estufa Fria & regresso',
        periodos: [
            {
                titulo: 'Manhã',
                atividades: [
                    { nome: 'Estufa Fria', mapsUrl: '' },
                    'Estufa Quente',
                    'Estufa Doce',
                    { nome: 'Parque Eduardo VII', mapsUrl: '' }
                ]
            },
            {
                titulo: 'Regresso',
                hora: '15:30',
                atividades: ['Voltar a casa do amigo, buscar as malas', 'Seguir para Sete Rios (chegar 1h antes)', 'Autocarro de regresso']
            }
        ]
    }
];

window.TRIP_CHECKLIST = [
    'Carregador',
    'Powerbank',
    'Roupa conforme o tempo',
    'Snacks',
    'Garrafa de água',
    'Cartão Navegante'
];

window.TRIP_ACTIVITY_OPTIONS = [
    'Escape Room',
    'Bowling',
    'Minigolfe',
    'Quiz Room',
    'Teleférico'
];

window.TRIP_PLANO_B = [
    'Centro Colombo',
    'LX Factory (coberto em parte)',
    'Oceanário',
    'Museus perto da zona do dia'
];
