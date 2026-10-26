# Structural model

## CRC cards

| Class | Responsibilities | Collaborators |
|---|---|---|
| WbsItem | Hold one leaf work package: ID, name, description, role hint, dates, working days, group | WbsReader |
| BreakdownRow | Hold one item for one role with involvement, class, allocation, reasons, review flag | WbsItem, Estimator, Engine |
| RoleFactors | Hold UCP actors and factor ratings with evidence for one role | Estimator, Engine |
| Parameters | Hold PHM, hours per day, days per month, tolerance, support factor, holidays, weights | Engine, ExcelBuilder |
| RoleEstimate | Hold UCP and bottom-up effort and FTE for one role | Engine |
| Comparison | Compare calculated need with request, existing talent, and reference | Engine |
| Finding | Describe a gap, overlap, divergence, data issue, or assumption | Reviewer, Engine |
| AiTask | Describe one task, its capability, AI category, weight, and saving | Augmentation, Engine |
| RunResult | Aggregate everything produced by one run; travel between browser and server | All |
| Catalog | Describe roles, rules, rubrics, and AI categories | Agents, ExcelBuilder |
| Engine | Recalculate every derived number from inputs | RunResult, Parameters |
| LLMClient | Return a validated object for a prompt from any provider | Skills |
| ExcelBuilder | Produce the workbook with formulas | RunResult, Catalog |

## Class diagram

```mermaid
classDiagram
    direction LR
    class RunResult {
        project: ProjectInfo
        parameters: Parameters
        roles: list~str~
        approved: bool
        message_draft: str
    }
    class ProjectInfo {
        name
        start
        end
        scope
        context
    }
    class Parameters {
        phm
        hours_per_day
        days_per_month
        tolerance
        support_factor
        holidays
    }
    class WbsItem {
        item_id
        name
        description
        role_hint
        start
        end
        workdays
    }
    class BreakdownRow {
        role
        involvement
        classification
        allocation_fte
        needs_review
        key()
    }
    class RoleFactors {
        role
        actors
        ratings
        evidence
        rating(code)
    }
    class RoleInput {
        role
        requested_fte
        existing_fte
        reference_fte
    }
    class RoleEstimate {
        ucp
        ucp_hours
        ucp_fte
        bu_person_days
        bu_fte
        ucp_peak_fte
        bu_peak_fte
    }
    class Comparison {
        ucp_additional_fte
        bu_additional_fte
        divergence
        conclusion
    }
    class Finding {
        kind
        message
        severity
        source
    }
    class AiTask {
        task
        weight
        pillar
        skill
        category
        saving
    }
    class AiAssessment {
        saving_share
        ucp_fte_assisted
        bu_fte_assisted
    }
    RunResult "1" *-- "1" ProjectInfo
    RunResult "1" *-- "1" Parameters
    RunResult "1" *-- "many" WbsItem
    RunResult "1" *-- "many" BreakdownRow
    RunResult "1" *-- "many" RoleFactors
    RunResult "1" *-- "many" RoleInput
    RunResult "1" *-- "many" RoleEstimate
    RunResult "1" *-- "many" Comparison
    RunResult "1" *-- "many" Finding
    RunResult "1" *-- "many" AiTask
    RunResult "1" *-- "many" AiAssessment
    WbsItem "1" <.. "0..many" BreakdownRow : derived from
    BreakdownRow "1" <.. "0..many" AiTask : split into
```

## Agent and skill classes

```mermaid
classDiagram
    class LLMClient {
        <<interface>>
        structured(schema, system, user, skill) T
    }
    class LangChainClient {
        config: ProviderConfig
        structured(...)
    }
    class ProviderConfig {
        provider
        model
        base_url
        api_version
        mask_pii
    }
    class AgentCard {
        name
        description
        optional
        skills: list~SkillSpec~
    }
    class SkillSpec {
        name
        kind: llm|code
        inputs
        outputs
    }
    LLMClient <|.. LangChainClient
    LangChainClient --> ProviderConfig
    AgentCard "1" *-- "many" SkillSpec
```
