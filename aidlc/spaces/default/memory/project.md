# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

- Kho git là tpp-simulator-app/ (backend) và tpp-simulator-portal/ (frontend), mỗi kho có CI và nhánh main riêng; thay cho dòng "tạo kho ở thư mục gốc dự án" trong team.md (learned 2026-10-19) <!-- cid:261018-tpp-callback-simulator:units-generation:ba2da512f0c896fe0d619712a279a0992d3e45a04149e76550efe5492eb55925 -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER hỏi lại các quyết định đã chốt trong docs/brief.md (ví dụ công nghệ ở mục 2), kể cả khi câu hỏi mẫu của stage có nhắc tới; chỉ hỏi những điểm brief chưa nói tới (learned 2026-10-18) <!-- cid:261018-tpp-callback-simulator:feasibility:0fca2d90615bfcfb9edbca4335e6dddcf7e018ccd6fe070f0c3b7a854f9c6752 -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

None. (affirmed 2026-10-19)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- ALWAYS ưu tiên câu trả lời mới, rõ ràng của người dùng hơn nội dung đã chốt trong docs/brief.md; nêu rõ hai nội dung mâu thuẫn và chỉ sửa đúng phần brief bị ảnh hưởng khi người dùng đồng ý (learned 2026-10-18) <!-- cid:261018-tpp-callback-simulator:intent-capture:c032da3f5aadd8506bb9a953b6dfab5f8b8ff3c73f474b62f0d6f877bf766b76 -->
- ALWAYS dùng thiết kế Google Stitch trong docs/design/stitch/ làm nguồn bố cục và phong cách giao diện, còn docs/brief.md vẫn là nguồn chức năng; bỏ phần thiết kế ngoài phạm vi brief và bổ sung phần brief yêu cầu mà thiết kế thiếu (learned 2026-10-19) <!-- cid:261018-tpp-callback-simulator:rough-mockups:7edccc28e2208642e3c531ddab27c09cdc10f53f1b0514d961ddc3498357e59c -->
