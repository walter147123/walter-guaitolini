# API de Atividades da Mergington High School

Uma aplicação FastAPI super simples que permite aos estudantes visualizar e se inscrever em atividades extracurriculares.

## Funcionalidades

- Visualizar todas as atividades extracurriculares disponíveis
- Inscrever-se em atividades

## Primeiros Passos

1. Instale as dependências:

   ```
   pip install fastapi uvicorn
   ```

2. Crie uma conta para cada professor autorizado. O comando solicita a senha sem exibi-la e grava somente um hash com salt no arquivo local ignorado pelo Git:

   ```
   python -m src.create_teacher professor
   ```

   Repita o comando para cada professor. Senhas devem ter pelo menos 12 caracteres. O arquivo `src/teachers.json` deve permanecer fora do controle de versão.

3. Execute a aplicação a partir da raiz do repositório:

   ```
   uvicorn src.app:app --reload
   ```

4. Abra seu navegador e vá para:
   - Documentação da API: http://localhost:8000/docs
   - Documentação alternativa: http://localhost:8000/redoc

Os estudantes podem consultar as atividades e os participantes sem entrar. O cadastro e cancelamento de inscrições exigem uma conta de professor. Em produção, publique a aplicação somente por HTTPS.

## Endpoints da API

| Método | Endpoint                                                          | Descrição                                                           |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Obter todas as atividades com seus detalhes e contagem atual de participantes |
| POST   | `/auth/login`                                                      | Validar as credenciais de um professor                              |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Inscrever um estudante (professor autenticado)                       |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Cancelar uma inscrição (professor autenticado)                    |

## Modelo de Dados

A aplicação usa um modelo de dados simples com identificadores significativos:

1. **Atividades** - Usa o nome da atividade como identificador:

   - Descrição
   - Cronograma
   - Número máximo de participantes permitidos
   - Lista de emails de estudantes que estão inscritos

2. **Estudantes** - Usa email como identificador:
   - Nome
   - Nível da série

Todos os dados são armazenados na memória, o que significa que os dados serão resetados quando o servidor reiniciar.
